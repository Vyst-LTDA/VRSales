
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Any

from app import crud
from app.models.user import User as UserModel
from app.schemas.customer import Customer as CustomerSchema, CustomerCreate, CustomerUpdate
from app.schemas.sale import Sale as SaleSchema
from app.api.dependencies import get_db, RoleChecker, get_current_active_user
from app.schemas.enums import UserRole

router = APIRouter()
full_permissions = RoleChecker([UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.SUPER_ADMIN])
manager_permissions = RoleChecker([UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN])

@router.post("/", response_model=CustomerSchema, status_code=status.HTTP_201_CREATED, dependencies=[Depends(full_permissions)])
async def create_customer(
    *,
    db: AsyncSession = Depends(get_db),
    customer_in: CustomerCreate,
    current_user: UserModel = Depends(get_current_active_user)
) -> Any:
    """
    Cria um novo cliente na loja do usuário autenticado.
    """
    return await crud.customer.create(db=db, obj_in=customer_in, current_user=current_user)

@router.get("/", response_model=List[CustomerSchema], dependencies=[Depends(full_permissions)])
async def read_customers(
    *,
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: UserModel = Depends(get_current_active_user)
) -> Any:
    """
    Retorna uma lista de clientes da loja do usuário autenticado.
    """
    return await crud.customer.get_multi(db, skip=skip, limit=limit, current_user=current_user)

@router.get(
    "/{customer_id}/sales",
    response_model=List[SaleSchema],
    dependencies=[Depends(manager_permissions)],
    summary="Obter Histórico de Vendas do Cliente"
)
async def get_customer_sales_history(
    *,
    db: AsyncSession = Depends(get_db),
    customer_id: int,
    current_user: UserModel = Depends(get_current_active_user)
) -> Any:
    """
    Recupera o histórico completo de vendas para um cliente específico da loja.
    """
    customer = await crud.customer.get(db, id=customer_id, current_user=current_user)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado ou não pertence a esta loja."
        )
    
    return await crud.sale.get_sales_by_customer(db, customer_id=customer_id, current_user=current_user)

# --- NOVO ENDPOINT ADICIONADO ---
@router.delete("/{customer_id}", response_model=CustomerSchema, dependencies=[Depends(manager_permissions)])
async def delete_customer(
    *,
    db: AsyncSession = Depends(get_db),
    customer_id: int,
    current_user: UserModel = Depends(get_current_active_user)
) -> Any:
    """
    Exclui um cliente da loja.
    """
    customer = await crud.customer.get(db, id=customer_id, current_user=current_user)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado"
        )
    
    deleted_customer = await crud.customer.remove(db=db, id=customer_id, current_user=current_user)
    return deleted_customer
