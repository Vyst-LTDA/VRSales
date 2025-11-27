from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Any

from app import crud
from app.models.user import User as UserModel
from app.schemas.category import ProductCategory, ProductCategoryCreate, ProductCategoryUpdate
from app.api.dependencies import get_db, get_current_active_user, RoleChecker
from app.schemas.enums import UserRole
from app.api import dependencies

router = APIRouter()
manager_permissions = RoleChecker([UserRole.ADMIN, UserRole.MANAGER])

@router.get("/", response_model=List[ProductCategory])
async def read_categories(
    db: AsyncSession = Depends(dependencies.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: UserModel = Depends(dependencies.get_current_active_user),
) -> Any:
    """ Lista as categorias da loja. """
    return await crud.category.get_multi(db, skip=skip, limit=limit, current_user=current_user)

@router.post("/", response_model=ProductCategory, status_code=status.HTTP_201_CREATED)
async def create_category(
    *,
    db: AsyncSession = Depends(dependencies.get_db),
    category_in: ProductCategoryCreate,
    current_user: UserModel = Depends(dependencies.get_current_active_user),
) -> Any:
    """ Cria uma nova categoria. """
    return await crud.category.create(db=db, obj_in=category_in, current_user=current_user)

@router.put("/{category_id}", response_model=ProductCategory, dependencies=[Depends(manager_permissions)])
async def update_category(
    *,
    db: AsyncSession = Depends(get_db),
    category_id: int,
    category_in: ProductCategoryUpdate,
    current_user: UserModel = Depends(get_current_active_user)
) -> Any:
    """Atualiza uma categoria de produto."""
    category = await crud.category.get(db=db, id=category_id, current_user=current_user)
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    return await crud.category.update(db=db, db_obj=category, obj_in=category_in, current_user=current_user)

@router.delete("/{category_id}", response_model=ProductCategory, dependencies=[Depends(manager_permissions)])
async def delete_category(
    *,
    db: AsyncSession = Depends(get_db),
    category_id: int,
    current_user: UserModel = Depends(get_current_active_user)
) -> Any:
    """Exclui uma categoria de produto."""
    category = await crud.category.remove(db=db, id=category_id, current_user=current_user)
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    return category