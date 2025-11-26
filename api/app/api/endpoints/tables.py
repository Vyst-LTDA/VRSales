# api/app/api/endpoints/tables.py
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import sqlalchemy as sa

from app.crud import crud_table
# --- CORREÇÃO: Importar crud_reservation para usar a função de ativação
from app.crud.crud_reservation import reservation as crud_reservation
# -------------------------------------------------------------------
from app.models.user import User as UserModel
from app.models.table import Table as TableModel
from app.models.order import Order, OrderItem
from app.schemas.table import Table as TableSchema, TableCreate, TableUpdate, TableLayoutUpdateRequest
from app.api.dependencies import get_db, get_current_active_user, RoleChecker
from app.schemas.enums import UserRole, OrderStatus, OrderItemStatus

router = APIRouter()
full_permissions = RoleChecker([UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.SUPER_ADMIN])
manager_permissions = RoleChecker([UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN])

@router.get("/", response_model=List[TableSchema])
async def read_tables(
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
) -> Any:
    """
    Busca todas as mesas da loja, incluindo informações sobre comandas abertas.
    Também verifica e ativa reservas para o dia de hoje.
    """
    # --- NOVO: Garante que reservas de hoje marquem as mesas como RESERVADAS ---
    await crud_reservation.ensure_todays_reservations_are_active(db, current_user)
    # ---------------------------------------------------------------------------

    stmt_tables = select(TableModel).where(TableModel.store_id == current_user.store_id)
    result_tables = await db.execute(stmt_tables)
    tables = result_tables.scalars().all()
    table_map = {t.id: t for t in tables}

    if not table_map:
        return []

    stmt_orders = (
        select(
            Order.table_id,
            Order.id,
            Order.created_at,
            sa.func.bool_or(OrderItem.status == OrderItemStatus.READY).label("has_ready_items")
        )
        .join(OrderItem, Order.id == OrderItem.order_id)
        .where(
            Order.store_id == current_user.store_id,
            Order.status == OrderStatus.OPEN,
            Order.table_id.in_(table_map.keys())
        )
        .group_by(Order.table_id, Order.id, Order.created_at)
    )
    result_orders = await db.execute(stmt_orders)
    
    order_info_map = {row.table_id: row for row in result_orders.mappings()}

    response_tables = []
    for table in tables:
        table_schema = TableSchema.model_validate(table, from_attributes=True)
        
        if table.status == 'occupied' and table.id in order_info_map:
            order_info = order_info_map[table.id]
            table_schema.open_order_id = order_info.id
            table_schema.open_order_created_at = order_info.created_at
            table_schema.has_ready_items = order_info.has_ready_items or False
        else:
            table_schema.has_ready_items = False

        response_tables.append(table_schema)
    
    response_tables.sort(key=lambda t: (0, int(t.number)) if t.number.isdigit() else (1, t.number))

    return response_tables

# ... (resto dos endpoints create_table, update_tables_layout, etc. permanecem iguais) ...

@router.post("/", response_model=TableSchema, status_code=status.HTTP_201_CREATED, dependencies=[Depends(manager_permissions)])
async def create_table(
    *,
    db: AsyncSession = Depends(get_db),
    table_in: TableCreate,
    current_user: UserModel = Depends(get_current_active_user)
) -> Any:
    return await crud_table.table.create(db=db, obj_in=table_in, current_user=current_user)

@router.put("/layout", response_model=List[TableSchema], dependencies=[Depends(manager_permissions)])
async def update_tables_layout(
    *,
    db: AsyncSession = Depends(get_db),
    layout_request: TableLayoutUpdateRequest,
    current_user: UserModel = Depends(get_current_active_user)
) -> Any:
    return await crud_table.table.update_layout(db=db, tables_layout=layout_request.tables, current_user=current_user)

@router.put("/{table_id}", response_model=TableSchema, dependencies=[Depends(manager_permissions)])
async def update_table(
    *,
    db: AsyncSession = Depends(get_db),
    table_id: int,
    table_in: TableUpdate,
    current_user: UserModel = Depends(get_current_active_user)
) -> Any:
    table = await crud_table.table.get(db=db, id=table_id, current_user=current_user)
    if not table:
        raise HTTPException(status_code=404, detail="Mesa não encontrada.")
    return await crud_table.table.update(db=db, db_obj=table, obj_in=table_in, current_user=current_user)

@router.delete("/{table_id}", response_model=TableSchema, dependencies=[Depends(manager_permissions)])
async def delete_table(
    *,
    db: AsyncSession = Depends(get_db),
    table_id: int,
    current_user: UserModel = Depends(get_current_active_user)
) -> Any:
    table = await crud_table.table.get(db=db, id=table_id, current_user=current_user)
    if not table:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mesa não encontrada para exclusão.")
    
    if table.status == 'occupied':
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Não é possível excluir uma mesa que está ocupada.")

    deleted_table = await crud_table.table.remove(db=db, id=table_id, current_user=current_user)
    if not deleted_table:
        raise HTTPException(status_code=404, detail="Mesa não encontrada.")
    return deleted_table