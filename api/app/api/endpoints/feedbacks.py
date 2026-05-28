from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api.dependencies import get_db, get_current_active_user, RoleChecker
from app.models.user import User as UserModel
from app.models.feedback import Feedback
from app.schemas.enums import UserRole
from app.schemas.feedback import FeedbackCreate, FeedbackUpdateStatus

router = APIRouter()
super_admin_permissions = RoleChecker([UserRole.SUPER_ADMIN])

@router.post("/")
async def create_feedback(
    feedback_in: FeedbackCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    new_feedback = Feedback(
        user_id=current_user.id,
        store_id=current_user.store_id,
        subject=feedback_in.subject,
        description=feedback_in.description,
        image_data=feedback_in.image_data # --- SALVANDO A IMAGEM ---
    )
    db.add(new_feedback)
    await db.commit()
    return {"message": "Feedback enviado com sucesso"}

@router.get("/", dependencies=[Depends(super_admin_permissions)])
async def get_all_feedbacks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Feedback)
        .options(selectinload(Feedback.user), selectinload(Feedback.store))
        .order_by(Feedback.created_at.desc())
    )
    feedbacks = result.scalars().all()
    
    return [
        {
            "id": f.id,
            "subject": f.subject,
            "description": f.description,
            "image_data": f.image_data, # --- RETORNANDO A IMAGEM ---
            "status": f.status,
            "created_at": f.created_at,
            "user_name": f.user.full_name,
            "store_name": f.store.name if f.store else "Sem Loja (Admin)",
        } for f in feedbacks
    ]

@router.put("/{feedback_id}/resolve", dependencies=[Depends(super_admin_permissions)])
async def resolve_feedback(feedback_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Feedback).filter(Feedback.id == feedback_id))
    feedback = result.scalars().first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Chamado não encontrado")
    
    feedback.status = "RESOLVED"
    await db.commit()
    return {"message": "Chamado resolvido"}