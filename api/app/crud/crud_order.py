# api/app/crud/crud_order.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import Session, selectinload, joinedload
from typing import List, Optional
from fastapi import HTTPException, status
from decimal import Decimal, ROUND_HALF_UP
from loguru import logger
from datetime import datetime

from app.crud.base import CRUDBase
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user import User
from app.models.table import Table
from app.models.sale import Sale, SaleItem as SaleItemModel
from app.models.payment import Payment
# --- IMPORTAÇÕES NECESSÁRIAS PARA O CARREGAMENTO ---
from app.models.category import ProductCategory
from app.models.variation import ProductVariation
# ---------------------------------------------------
from app.schemas.enums import TableStatus, OrderStatus, OrderType
from app.schemas.order import OrderCreate, OrderUpdate, OrderItemCreate, PartialPaymentRequest, OrderMerge, OrderTransfer
from app.services.cash_register_service import cash_register_service
from app.services.crm_service import crm_service
from app.services.stock_service import stock_service

async def get_full_order(db: AsyncSession, *, id: int) -> Optional[Order]:
    """ Carrega uma comanda com todos os seus relacionamentos profundos. """
    stmt = select(Order).where(Order.id == id).options(
        # Carregamento profundo dos itens
        selectinload(Order.items).joinedload(OrderItem.product).options(
            # Carrega Categoria E Subcategorias (Correção do Erro)
            joinedload(Product.category).selectinload(ProductCategory.subcategories),
            joinedload(Product.subcategory),
            joinedload(Product.supplier),
            selectinload(Product.variations)
        ),
        selectinload(Order.table),
        selectinload(Order.user),
        selectinload(Order.customer)
    )
    result = await db.execute(stmt)
    return result.scalars().first()

def _run_sync_post_sale_services(db_session: Session, *, sale: Sale):
    """ Executa os serviços síncronos de forma segura e atômica. """
    sync_sale = db_session.merge(sale)
    cash_register_service.add_sale_transaction(db_session, sale=sync_sale)
    crm_service.update_customer_stats_from_sale(db_session, sale=sync_sale)
    stock_service.deduct_stock_from_sale(db_session, sale=sync_sale)
    db_session.commit()


class CRUDOrder(CRUDBase[Order, OrderCreate, OrderUpdate]):

    async def process_partial_payment(self, db: AsyncSession, *, order_id: int, payment_request: PartialPaymentRequest, current_user: User) -> Order:
        # ... (Mantenha a lógica de pagamento igual, ela chama get_full_order que já corrigimos) ...
        logger.info(f"Iniciando pagamento para comanda ID: {order_id} pelo usuário ID: {current_user.id}")
        
        order = await get_full_order(db, id=order_id)
        
        if not order or order.store_id != current_user.store_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comanda não encontrada.")
        if order.status != OrderStatus.OPEN:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta comanda não está mais aberta.")

        total_to_pay_decimal = Decimal("0.0")
        items_to_update_in_order = []
        sale_items_for_history = []

        for item_to_pay in payment_request.items_to_pay:
            order_item = next((i for i in order.items if i.id == item_to_pay.order_item_id), None)
            if not order_item:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Item com ID {item_to_pay.order_item_id} não encontrado na comanda.")

            available_quantity = order_item.quantity - order_item.paid_quantity
            if item_to_pay.quantity > available_quantity:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Quantidade a pagar maior que a pendente.")

            order_item.paid_quantity += item_to_pay.quantity
            items_to_update_in_order.append(order_item)

            item_total = Decimal(str(order_item.price_at_order)) * Decimal(item_to_pay.quantity)
            total_to_pay_decimal += item_total
            
            sale_items_for_history.append(
                SaleItemModel(
                    product_id=order_item.product_id,
                    quantity=item_to_pay.quantity,
                    price_at_sale=order_item.price_at_order
                )
            )
        
        total_to_pay_float = float(total_to_pay_decimal.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
        total_paid_amount = sum(p.amount for p in payment_request.payments)

        if total_paid_amount < total_to_pay_float:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Valor pago insuficiente.")

        db_sale = Sale(
            total_amount=total_to_pay_float,
            payment_method=payment_request.payments[0].payment_method,
            user_id=current_user.id,
            store_id=current_user.store_id,
            customer_id=payment_request.customer_id or order.customer_id,
            items=sale_items_for_history,
            payments=[Payment(**p.model_dump()) for p in payment_request.payments]
        )
        db.add(db_sale)
        db.add_all(items_to_update_in_order)

        all_items_paid = all((item.quantity == item.paid_quantity) for item in order.items)
        if all_items_paid:
            order.status = OrderStatus.PAID
            if order.table:
                order.table.status = TableStatus.AVAILABLE
                db.add(order.table)

        await db.commit()
        await db.refresh(db_sale)
        await db.run_sync(_run_sync_post_sale_services, sale=db_sale)
        
        return await get_full_order(db, id=order.id)
    
    async def get_open_order_by_table(self, db: AsyncSession, *, table_id: int, current_user: User) -> Optional[Order]:
        stmt = (
            select(Order)
            .where(Order.store_id == current_user.store_id, Order.table_id == table_id, Order.status == OrderStatus.OPEN)
            .options(
                # Carregamento Profundo para evitar MissingGreenlet
                selectinload(Order.items).joinedload(OrderItem.product).options(
                    joinedload(Product.category).selectinload(ProductCategory.subcategories),
                    joinedload(Product.subcategory),
                    joinedload(Product.supplier),
                    selectinload(Product.variations)
                ), 
                selectinload(Order.customer)
            )
        )
        result = await db.execute(stmt)
        return result.scalars().first()

    async def get_open_pos_order(self, db: AsyncSession, *, current_user: User) -> Optional[Order]:
        stmt = (
            select(Order)
            .where(Order.store_id == current_user.store_id, Order.status == OrderStatus.OPEN, Order.order_type == OrderType.TAKEOUT, Order.table_id == None)
            .options(
                # Carregamento Profundo para evitar MissingGreenlet
                selectinload(Order.items).joinedload(OrderItem.product).options(
                    joinedload(Product.category).selectinload(ProductCategory.subcategories),
                    joinedload(Product.subcategory),
                    joinedload(Product.supplier),
                    selectinload(Product.variations)
                ), 
                selectinload(Order.customer)
            )
        )
        result = await db.execute(stmt)
        return result.scalars().first()

    async def close_order(self, db: AsyncSession, *, order: Order) -> Order:
        order.status = OrderStatus.CLOSED
        order.closed_at = datetime.utcnow()
        db.add(order)
        await db.commit()
        await db.refresh(order)
        return order

    async def add_item_to_order(self, db: AsyncSession, *, order: Order, item_in: OrderItemCreate, current_user: User) -> Order:
        # A lógica permanece a mesma, mas garantimos que o retorno (no endpoint) chame get_full_order
        if order.status != OrderStatus.OPEN:
            raise HTTPException(status_code=400, detail="A comanda não está aberta.")
        product = await db.get(Product, item_in.product_id)
        if not product or product.store_id != current_user.store_id:
            raise HTTPException(status_code=404, detail="Produto não encontrado.")
        
        # Usa selectinload para garantir que items estejam carregados antes de iterar
        stmt = select(Order).where(Order.id == order.id).options(selectinload(Order.items))
        result = await db.execute(stmt)
        order = result.scalars().first()

        existing_item = next((item for item in order.items if item.product_id == item_in.product_id and (item.notes or '') == (item_in.notes or '')), None)
        
        if existing_item:
            new_quantity = existing_item.quantity + item_in.quantity
            if new_quantity > 0:
                existing_item.quantity = new_quantity
                db.add(existing_item)
            else:
                await db.delete(existing_item)
        elif item_in.quantity > 0:
            new_item = OrderItem(order_id=order.id, product_id=item_in.product_id, quantity=item_in.quantity, price_at_order=product.price, notes=item_in.notes)
            db.add(new_item)
        
        await db.commit()
        # O retorno final é tratado pelo endpoint chamando get_full_order
        return order 
    
    async def cancel_order(self, db: AsyncSession, *, order: Order, current_user: User) -> Order:
        if order.status != OrderStatus.OPEN:
            raise HTTPException(status_code=400, detail="Apenas comandas abertas podem ser canceladas.")
        if order.table_id:
            table = await db.get(Table, order.table_id)
            if table and table.store_id == current_user.store_id:
                table.status = TableStatus.AVAILABLE
                db.add(table)
        order.status = OrderStatus.CANCELLED
        order.closed_at = datetime.utcnow()
        db.add(order)
        await db.commit()
        await db.refresh(order)
        return order

    async def get_for_user(self, db: AsyncSession, *, id: int, current_user: User) -> Optional[Order]:
        # Adicionado options aqui também para garantir segurança em outras chamadas
        stmt = select(Order).where(Order.id == id, Order.store_id == current_user.store_id).options(
             selectinload(Order.items).joinedload(OrderItem.product).options(
                joinedload(Product.category).selectinload(ProductCategory.subcategories)
            )
        )
        result = await db.execute(stmt)
        return result.scalars().first()

    async def create(self, db: AsyncSession, *, obj_in: OrderCreate, current_user: User) -> Order:
        if obj_in.order_type == OrderType.DINE_IN:
            if not obj_in.table_id:
                raise HTTPException(status_code=400, detail="O ID da mesa é obrigatório para comandas de salão.")
            table = await db.get(Table, obj_in.table_id)
            if not table:
                raise HTTPException(status_code=404, detail="Mesa não encontrada.")
            if table.status == TableStatus.OCCUPIED:
                raise HTTPException(status_code=400, detail="A mesa já está ocupada.")
            table.status = TableStatus.OCCUPIED
            db.add(table)
        order_data = obj_in.model_dump()
        db_order = Order(**order_data, user_id=current_user.id, store_id=current_user.store_id, status=OrderStatus.OPEN)
        db.add(db_order)
        await db.commit()
        await db.refresh(db_order)
        # Retorno é feito pelo endpoint usando get_full_order
        return db_order
    
    async def transfer_order(self, db: AsyncSession, *, source_order: Order, target_table_id: int, current_user: User) -> Order:
        target_table = await db.get(Table, target_table_id)
        if not target_table or target_table.store_id != current_user.store_id:
            raise HTTPException(status_code=404, detail="Mesa de destino não encontrada.")
        if target_table.status != TableStatus.AVAILABLE:
            raise HTTPException(status_code=400, detail="Mesa de destino não está livre.")
        
        if source_order.table:
            source_order.table.status = TableStatus.AVAILABLE
            db.add(source_order.table)
            
        target_table.status = TableStatus.OCCUPIED
        source_order.table_id = target_table.id
        db.add(target_table)
        db.add(source_order)
        
        await db.commit()
        await db.refresh(source_order)
        return source_order

    async def merge_orders(self, db: AsyncSession, *, target_order: Order, source_order_id: int, current_user: User) -> Order:
        source_order = await get_full_order(db, id=source_order_id)
        if not source_order or source_order.store_id != current_user.store_id:
            raise HTTPException(status_code=404, detail="Comanda de origem não encontrada.")

        for item in source_order.items:
            item.order_id = target_order.id
            db.add(item)
            
        await self.cancel_order(db, order=source_order, current_user=current_user)
        
        await db.commit()
        return await get_full_order(db, id=target_order.id)

    async def get_kitchen_orders(self, db: AsyncSession, *, current_user: User) -> List[Order]:
        stmt = (
            select(Order)
            .where(
                Order.store_id == current_user.store_id,
                Order.status == OrderStatus.OPEN
            )
            .options(
                selectinload(Order.table),
                selectinload(Order.user),
                selectinload(Order.items).joinedload(OrderItem.product).options(
                    # Carregamento profundo aqui também
                    joinedload(Product.category).selectinload(ProductCategory.subcategories),
                    joinedload(Product.subcategory),
                    joinedload(Product.supplier),
                    selectinload(Product.variations).selectinload(ProductVariation.options) 
                )
            )
            .order_by(Order.created_at)
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    async def update_order_item_status(self, db: AsyncSession, *, item_id: int, new_status: str, current_user: User) -> Optional[OrderItem]:
        stmt = (
            select(OrderItem)
            .join(Order)
            .where(OrderItem.id == item_id, Order.store_id == current_user.store_id)
        )
        result = await db.execute(stmt)
        item = result.scalars().first()
        
        if item:
            item.status = new_status
            db.add(item)
            await db.commit()
            await db.refresh(item)
        
        return item

    # --- NOVOS MÉTODOS PARA STAND-BY ---
    async def hold_order(self, db: AsyncSession, *, order: Order) -> Order:
        order.status = OrderStatus.ON_HOLD
        db.add(order)
        await db.commit()
        await db.refresh(order)
        return order

    async def get_held_orders(self, db: AsyncSession, *, current_user: User) -> List[Order]:
        stmt = (
            select(Order)
            .where(
                Order.store_id == current_user.store_id,
                Order.status == OrderStatus.ON_HOLD,
                Order.order_type == OrderType.TAKEOUT
            )
            .options(
                selectinload(Order.items).selectinload(OrderItem.product),
                selectinload(Order.customer)
            )
            .order_by(Order.created_at.desc())
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    async def resume_order(self, db: AsyncSession, *, order: Order) -> Order:
        order.status = OrderStatus.OPEN
        db.add(order)
        await db.commit()
        await db.refresh(order)
        return await get_full_order(db, id=order.id)
    
    # --- MÉTODOS PARA ATUALIZAR/REMOVER ITENS DO POS ---
    async def update_item_quantity(
        self, db: AsyncSession, *, order_id: int, item_id: int, quantity: int, current_user: User
    ) -> Order:
        stmt = select(OrderItem).where(OrderItem.id == item_id, OrderItem.order_id == order_id)
        result = await db.execute(stmt)
        item = result.scalars().first()
        
        if not item:
            raise HTTPException(status_code=404, detail="Item não encontrado neste pedido.")

        item.quantity = quantity
        db.add(item)
        await db.commit()
        
        return await get_full_order(db, id=order_id)

    async def remove_item_from_order(
        self, db: AsyncSession, *, order_id: int, item_id: int, current_user: User
    ) -> Order:
        stmt = select(OrderItem).where(OrderItem.id == item_id, OrderItem.order_id == order_id)
        result = await db.execute(stmt)
        item = result.scalars().first()
        s
        if not item:
            raise HTTPException(status_code=404, detail="Item não encontrado.")
            
        await db.delete(item)
        await db.commit()
        
        return await get_full_order(db, id=order_id)

order = CRUDOrder(Order)