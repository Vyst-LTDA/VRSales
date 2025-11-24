from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Any
from sqlalchemy import select

from app.api.dependencies import get_db, get_current_active_user, RoleChecker
from app.models.user import User as UserModel
from app.models.campaign import Campaign as CampaignModel
from app.schemas.marketing import Campaign, CampaignCreate
from app.services.notification_service import notification_service
from app.schemas.enums import UserRole

router = APIRouter()
manager_permissions = RoleChecker([UserRole.ADMIN, UserRole.MANAGER])

@router.get("/campaigns", response_model=List[Campaign], dependencies=[Depends(manager_permissions)])
async def get_marketing_campaigns(
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
) -> Any:
    """ Retorna a lista de campanhas da loja. """
    result = await db.execute(select(CampaignModel).where(CampaignModel.store_id == current_user.store_id))
    return result.scalars().all()

@router.post("/campaigns", response_model=Campaign, status_code=status.HTTP_201_CREATED, dependencies=[Depends(manager_permissions)])
async def create_marketing_campaign(
    campaign_in: CampaignCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
) -> Any:
    """ 
    Cria uma nova campanha. 
    Se não tiver data agendada, envia imediatamente em background.
    """
    db_campaign = CampaignModel(
        **campaign_in.model_dump(exclude={"send_date"}),
        scheduled_for=campaign_in.send_date,
        store_id=current_user.store_id,
        status="draft"
    )
    
    db.add(db_campaign)
    await db.commit()
    await db.refresh(db_campaign)

    # Se não tem data futura agendada, dispara o envio agora (em background)
    if not db_campaign.scheduled_for:
        # Precisamos usar run_sync pois o notification_service usa Session síncrona por enquanto
        # ou adaptar o notification_service para async. 
        # Para simplificar, usamos uma função wrapper simples aqui:
        background_tasks.add_task(process_campaign_background, db_campaign.id)
        
        # Atualiza status para 'processando' visualmente
        db_campaign.status = "processing"
        await db.commit()

    return db_campaign

@router.delete("/campaigns/{campaign_id}", status_code=204, dependencies=[Depends(manager_permissions)])
async def delete_marketing_campaign(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    campaign = await db.get(CampaignModel, campaign_id)
    if not campaign or campaign.store_id != current_user.store_id:
        raise HTTPException(status_code=404, detail="Campanha não encontrada")
    
    await db.delete(campaign)
    await db.commit()
    return

# --- Função auxiliar CORRIGIDA para rodar com AsyncSession ---
from app.db.session import AsyncSessionLocal

async def process_campaign_background(campaign_id: int):
    """
    Cria uma sessão assíncrona isolada e executa o serviço de envio.
    Agora que send_campaign é async, podemos usar await diretamente.
    """
    async with AsyncSessionLocal() as db:
        try:
            await notification_service.send_campaign(db, campaign_id=campaign_id)
        except Exception as e:
            # Loga o erro mas não quebra a aplicação principal
            from loguru import logger
            logger.error(f"Erro crítico na tarefa de background da campanha {campaign_id}: {e}")