# api/app/api/endpoints/walls.py
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Any
from sqlalchemy.ext.asyncio import AsyncSession

# Importa o CRUD específico para paredes
from app.crud.crud_wall import wall as crud_wall
from app.models.user import User as UserModel
# Importa os schemas específicos para paredes
from app.schemas.wall import Wall as WallSchema, WallCreate, WallUpdate, WallLayoutUpdate
from app.api.dependencies import get_db, get_current_active_user, RoleChecker
from app.schemas.enums import UserRole

router = APIRouter()
# Permissões: Somente Admin e Manager podem gerenciar o layout
manager_permissions = RoleChecker([UserRole.ADMIN, UserRole.MANAGER])

@router.get("/", response_model=List[WallSchema])
async def read_walls(
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
) -> Any:
    """
    Busca todas as paredes da loja do usuário logado.
    """
    # A CRUDBase já filtra pela store_id do current_user (exceto super_admin)
    return await crud_wall.get_multi(db=db, current_user=current_user)

@router.post("/", response_model=WallSchema, status_code=status.HTTP_201_CREATED, dependencies=[Depends(manager_permissions)])
async def create_wall(
    *,
    db: AsyncSession = Depends(get_db),
    wall_in: WallCreate,
    current_user: UserModel = Depends(get_current_active_user)
) -> Any:
    """
    Cria uma nova parede no layout da loja.
    """
    return await crud_wall.create(db=db, obj_in=wall_in, current_user=current_user)

@router.put("/layout", response_model=List[WallSchema], dependencies=[Depends(manager_permissions)])
async def update_walls_layout(
    *,
    db: AsyncSession = Depends(get_db),
    walls_layout: List[WallLayoutUpdate], # Recebe a lista de atualizações de layout
    current_user: UserModel = Depends(get_current_active_user)
) -> Any:
    """
    Atualiza a posição e rotação de múltiplas paredes.
    """
    return await crud_wall.update_layout(db=db, walls_layout=walls_layout, current_user=current_user)

@router.put("/{wall_id}", response_model=WallSchema, dependencies=[Depends(manager_permissions)])
async def update_wall(
    *,
    db: AsyncSession = Depends(get_db),
    wall_id: int,
    wall_in: WallUpdate, # Schema para atualizar dados individuais (como dimensões, tipo)
    current_user: UserModel = Depends(get_current_active_user)
) -> Any:
    """
    Atualiza as propriedades de uma parede específica (largura, altura, tipo).
    """
    wall = await crud_wall.get(db=db, id=wall_id, current_user=current_user)
    if not wall:
        raise HTTPException(status_code=404, detail="Parede não encontrada.")
    return await crud_wall.update(db=db, db_obj=wall, obj_in=wall_in, current_user=current_user)

@router.delete("/{wall_id}", response_model=WallSchema, dependencies=[Depends(manager_permissions)])
async def delete_wall(
    *,
    db: AsyncSession = Depends(get_db),
    wall_id: int,
    current_user: UserModel = Depends(get_current_active_user)
) -> Any:
    """
    Exclui uma parede do layout.
    """
    deleted_wall = await crud_wall.remove(db=db, id=wall_id, current_user=current_user)
    if not deleted_wall:
        raise HTTPException(status_code=404, detail="Parede não encontrada.")
    return deleted_wall