from datetime import datetime
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.api.dependencies import get_db, get_current_active_user
from app.models.user import User as UserModel
from app.models.order import Order, OrderItem
from app.models.cash_register import CashRegister
from app.schemas.cash_register import (
    CashRegister as CashRegisterSchema, 
    CashRegisterOpen, 
    CashRegisterClose
)
from app.crud.crud_cash_register import cash_register as crud_cash_register

router = APIRouter()

@router.get("/status", response_model=CashRegisterSchema)
async def get_cash_register_status(
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    open_register = await crud_cash_register.get_open_register_for_store(db, store_id=current_user.store_id)
    if not open_register:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhum caixa aberto encontrado."
        )
    return open_register

@router.post("/open", response_model=CashRegisterSchema, status_code=status.HTTP_201_CREATED)
async def open_cash_register(
    *,
    db: AsyncSession = Depends(get_db),
    open_info: CashRegisterOpen,
    current_user: UserModel = Depends(get_current_active_user)
):
    existing_open = await crud_cash_register.get_open_register_for_store(db, store_id=current_user.store_id)
    if existing_open:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe um caixa aberto. Feche-o antes de abrir um novo."
        )
    
    return await crud_cash_register.open_register(db=db, user=current_user, open_info=open_info)

@router.post("/close")
async def close_cash_register(
    *,
    db: AsyncSession = Depends(get_db),
    close_info: CashRegisterClose,
    current_user: UserModel = Depends(get_current_active_user)
) -> Any:
    open_register = await crud_cash_register.get_open_register_for_store(db, store_id=current_user.store_id)
    
    if not open_register:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Você não tem nenhum caixa aberto para fechar."
        )

    # Corrigido o status do pedido para 'PAID' (ou o status correto do seu ENUM)
    # e aplicada a soma cruzando com os itens do pedido
    stmt_sales = (
        select(func.sum(OrderItem.quantity * OrderItem.price_at_order))
        .select_from(Order)
        .join(OrderItem)
        .where(
            Order.created_at >= open_register.opened_at,
            Order.status == "PAID", 
            Order.store_id == current_user.store_id
        )
    )
    result_sales = await db.execute(stmt_sales)
    total_sales = result_sales.scalar() or 0.0

    # ALTERADO AQUI: open_register.initial_balance -> open_register.opening_balance
    expected_balance = float(open_register.opening_balance) + float(total_sales)
    difference = float(close_info.closing_balance) - expected_balance

    open_register.status = "CLOSED"
    open_register.closed_at = datetime.utcnow()
    open_register.closing_balance = close_info.closing_balance

    db.add(open_register)
    await db.commit()
    await db.refresh(open_register)

    return {
        "id": open_register.id,
        "opened_at": open_register.opened_at,
        "closed_at": open_register.closed_at,
        # ALTERADO AQUI: initial_balance -> opening_balance
        "opening_balance": open_register.opening_balance, 
        "closing_balance": open_register.closing_balance,
        "total_sales": float(total_sales),
        "expected_balance": expected_balance,
        "difference": difference
    }

@router.get("/history", response_model=List[CashRegisterSchema])
async def get_cash_register_history(
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    stmt = select(CashRegister).where(
        CashRegister.store_id == current_user.store_id,
        CashRegister.status == "CLOSED"
    ).order_by(CashRegister.closed_at.desc())
    
    result = await db.execute(stmt)
    return result.scalars().all()