# api/app/crud/crud_sale.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import Session, selectinload, joinedload
from typing import List, Optional
from fastapi import HTTPException, status
from decimal import Decimal, ROUND_HALF_UP
from loguru import logger
from datetime import datetime
from app.crud.base import CRUDBase
from app.models.sale import Sale, SaleItem as SaleItemModel
from app.models.payment import Payment
from app.models.product import Product
from app.models.user import User
# --- IMPORTAÇÕES NOVAS ---
from app.models.order import Order # Para fechar o pedido
from app.schemas.enums import OrderStatus # Para o status CLOSED
# -------------------------
from app.models.category import ProductCategory
from app.schemas.sale import SaleCreate, SaleUpdate

from app.services.crm_service import crm_service
from app.services.stock_service import stock_service
from app.services.cash_register_service import cash_register_service


async def get_full_sale(db: AsyncSession, *, id: int) -> Optional[Sale]:
    stmt = select(Sale).where(Sale.id == id).options(
        selectinload(Sale.items).options(
            # --- CORREÇÃO: Carregamento Profundo ---
            joinedload(SaleItemModel.product).options(
                joinedload(Product.category).selectinload(ProductCategory.subcategories),
                joinedload(Product.subcategory)
            )
            # ---------------------------------------
        ),
        selectinload(Sale.payments),
        selectinload(Sale.customer),
        selectinload(Sale.user)
    )
    result = await db.execute(stmt)
    return result.scalars().first()


def _run_sync_post_sale_services(db_session: Session, *, sale: Sale):
    """ Executa os serviços síncronos de forma segura. """
    sync_sale = db_session.merge(sale)
    cash_register_service.add_sale_transaction(db_session, sale=sync_sale)
    crm_service.update_customer_stats_from_sale(db_session, sale=sync_sale)
    stock_service.deduct_stock_from_sale(db_session, sale=sync_sale)
    db_session.commit()


class CRUDSale(CRUDBase[Sale, SaleCreate, SaleUpdate]):
    
    async def get_multi_detailed(
        self, db: AsyncSession, *, skip: int = 0, limit: int = 100, current_user: User
    ) -> List[Sale]:
        stmt = (
            select(self.model)
            .where(self.model.store_id == current_user.store_id)
            .options(
                selectinload(self.model.items).options(
                    # --- CORREÇÃO AQUI TAMBÉM ---
                    selectinload(SaleItemModel.product).options(
                        joinedload(Product.category).selectinload(ProductCategory.subcategories)
                    )
                ),
                selectinload(self.model.customer),
                selectinload(self.model.user),
                selectinload(self.model.payments)
            )
            .order_by(self.model.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    async def create_with_items(self, db: AsyncSession, *, obj_in: SaleCreate, current_user: User) -> Sale:
        sale_data = obj_in.model_dump()
        items_data = sale_data.pop("items", [])
        payments_data = sale_data.pop("payments", [])
        
        # --- LÓGICA DE FECHAMENTO DE PEDIDO ---
        order_id = sale_data.pop("order_id", None) # Extrai o ID do pedido
        # --------------------------------------

        if not items_data or not payments_data:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A venda deve conter itens e pagamento.")

        total_amount = sum(Decimal(str(item['price_at_sale'])) * Decimal(item['quantity']) for item in items_data)
        total_amount = float(total_amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))

        total_paid = sum(p['amount'] for p in payments_data)
        # Pequena margem de erro para floats
        if total_paid < (total_amount - 0.05): 
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Valor pago insuficiente.")

        primary_payment_method = payments_data[0]['payment_method'] if payments_data else "other"

        db_sale = Sale(
            total_amount=total_amount,
            payment_method=primary_payment_method,
            user_id=current_user.id,
            store_id=current_user.store_id,
            customer_id=obj_in.customer_id,
            items=[SaleItemModel(**item) for item in items_data],
            payments=[Payment(**p) for p in payments_data]
        )
        
        db.add(db_sale)
        
        # --- FECHAR A COMANDA AUTOMATICAMENTE ---
        if order_id:
            stmt = select(Order).where(Order.id == order_id)
            result = await db.execute(stmt)
            order_obj = result.scalars().first()
            
            if order_obj:
                # Se a comanda pertence à mesma loja, fechamos ela
                if order_obj.store_id == current_user.store_id:
                    order_obj.status = OrderStatus.CLOSED
                    order_obj.closed_at = datetime.utcnow() # Importante importar datetime se não tiver
                    db.add(order_obj)
                    logger.info(f"Comanda #{order_id} fechada automaticamente pela Venda.")
        # ----------------------------------------

        await db.commit()
        await db.refresh(db_sale)

        # Serviços Pós-Venda (Estoque, Caixa, CRM)
        await db.run_sync(_run_sync_post_sale_services, sale=db_sale)
        
        return await get_full_sale(db, id=db_sale.id)

    async def get_sales_by_customer(self, db: AsyncSession, *, customer_id: int, current_user: User) -> List[Sale]:
        stmt = (
            select(self.model)
            .filter(Sale.customer_id == customer_id, Sale.store_id == current_user.store_id)
            .options(selectinload(Sale.items).selectinload(SaleItemModel.product))
            .order_by(Sale.created_at.desc())
        )
        result = await db.execute(stmt)
        return result.scalars().all()

sale = CRUDSale(Sale)