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
from app.schemas.enums import TableStatus, OrderStatus, OrderType
from app.schemas.order import OrderCreate, OrderUpdate, OrderItemCreate, PartialPaymentRequest, OrderMerge, OrderTransfer
from app.services.cash_register_service import cash_register_service
from app.services.crm_service import crm_service
from app.services.stock_service import stock_service

async def get_full_order(db: AsyncSession, *, id: int) -> Optional[Order]:
    """ Carrega uma comanda com todos os seus relacionamentos. """
    stmt = select(Order).where(Order.id == id).options(
        selectinload(Order.items).options(
            joinedload(OrderItem.product)
        ),
        selectinload(Order.table),
        selectinload(Order.user),
        selectinload(Order.customer)
    )
    result = await db.execute(stmt)
    return result.scalars().first()

def _run_sync_post_sale_services(db_session: Session, *, sale: Sale):
    """
    Executa os serviços síncronos de forma segura e atômica.
    """
    sync_sale = db_session.merge(sale)
    
    cash_register_service.add_sale_transaction(db_session, sale=sync_sale)
    crm_service.update_customer_stats_from_sale(db_session, sale=sync_sale)
    stock_service.deduct_stock_from_sale(db_session, sale=sync_sale)
    
    db_session.commit()


class CRUDOrder(CRUDBase[Order, OrderCreate, OrderUpdate]):

    async def process_partial_payment(self, db: AsyncSession, *, order_id: int, payment_request: PartialPaymentRequest, current_user: User) -> Order:
        logger.info(f"Iniciando pagamento para comanda ID: {order_id} pelo usuário ID: {current_user.id}")
        
        order = await get_full_order(db, id=order_id)
        
        if not order or order.store_id != current_user.store_id:
            logger.error(f"FALHA: Comanda ID {order_id} não encontrada.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comanda não encontrada.")
        if order.status != OrderStatus.OPEN:
            logger.error(f"FALHA: Tentativa de pagar comanda ID {order_id} com status '{order.status}'.")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta comanda não está mais aberta.")

        total_to_pay_decimal = Decimal("0.0")
        items_to_update_in_order = []
        sale_items_for_history = []

        for item_to_pay in payment_request.items_to_pay:
            order_item = next((i for i in order.items if i.id == item_to_pay.order_item_id), None)
            
            if not order_item:
                logger.error(f"FALHA: Item de comanda ID {item_to_pay.order_item_id} não encontrado.")
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Item com ID {item_to_pay.order_item_id} não encontrado na comanda.")

            available_quantity = order_item.quantity - order_item.paid_quantity
            if item_to_pay.quantity > available_quantity:
                logger.error(f"FALHA: Tentativa de pagar {item_to_pay.quantity} de '{order_item.product.name}', mas apenas {available_quantity} estão disponíveis.")
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Quantidade a pagar ({item_to_pay.quantity}) para o item '{order_item.product.name}' é maior que a quantidade pendente ({available_quantity}).")

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
            logger.error(f"FALHA: Valor pago (R$ {total_paid_amount}) é menor que o total dos itens (R$ {total_to_pay_float}).")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Valor pago (R$ {total_paid_amount}) é menor que o total dos itens selecionados (R$ {total_to_pay_float}).")

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
            logger.info(f"Comanda ID {order.id} totalmente paga. Liberando a mesa {order.table_id}.")

        await db.commit()
        await db.refresh(db_sale)

        logger.info(f"Venda (Sale) ID {db_sale.id} criada a partir da comanda. Executando serviços de pós-venda...")
        await db.run_sync(_run_sync_post_sale_services, sale=db_sale)
        logger.info("Serviços de pós-venda concluídos.")
        
        return await get_full_order(db, id=order.id)
    
    async def get_open_order_by_table(self, db: AsyncSession, *, table_id: int, current_user: User) -> Optional[Order]:
        stmt = ( select(Order).where(Order.store_id == current_user.store_id, Order.table_id == table_id, Order.status == OrderStatus.OPEN).options(selectinload(Order.items).selectinload(OrderItem.product), selectinload(Order.customer)))
        result = await db.execute(stmt)
        return result.scalars().first()

    async def get_open_pos_order(self, db: AsyncSession, *, current_user: User) -> Optional[Order]:
        stmt = ( select(Order).where(Order.store_id == current_user.store_id, Order.status == OrderStatus.OPEN, Order.order_type == OrderType.TAKEOUT, Order.table_id == None).options(selectinload(Order.items).selectinload(OrderItem.product), selectinload(Order.customer)))
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
        if order.status != OrderStatus.OPEN:
            raise HTTPException(status_code=400, detail="A comanda não está aberta.")
        product = await db.get(Product, item_in.product_id)
        if not product or product.store_id != current_user.store_id:
            raise HTTPException(status_code=404, detail="Produto não encontrado.")
        await db.refresh(order, attribute_names=['items'])
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
        return await get_full_order(db, id=order.id)
    
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
        stmt = select(Order).filter(Order.id == id, Order.store_id == current_user.store_id)
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
        return await get_full_order(db, id=db_order.id)
    
    # --- INÍCIO DAS NOVAS FUNÇÕES ---
    async def transfer_order(self, db: AsyncSession, *, source_order: Order, target_table_id: int, current_user: User) -> Order:
        """Transfere uma comanda para uma nova mesa."""
        target_table = await db.get(Table, target_table_id)
        if not target_table or target_table.store_id != current_user.store_id:
            raise HTTPException(status_code=404, detail="Mesa de destino não encontrada.")
        if target_table.status != TableStatus.AVAILABLE:
            raise HTTPException(status_code=400, detail="Mesa de destino não está livre.")
        
        # Libera a mesa antiga
        if source_order.table:
            source_order.table.status = TableStatus.AVAILABLE
            db.add(source_order.table)
            
        # Ocupa a nova mesa e atualiza a comanda
        target_table.status = TableStatus.OCCUPIED
        source_order.table_id = target_table.id
        db.add(target_table)
        db.add(source_order)
        
        await db.commit()
        await db.refresh(source_order)
        return source_order

    async def merge_orders(self, db: AsyncSession, *, target_order: Order, source_order_id: int, current_user: User) -> Order:
        """Junta os itens de uma comanda de origem em uma comanda de destino."""
        source_order = await get_full_order(db, id=source_order_id)
        if not source_order or source_order.store_id != current_user.store_id:
            raise HTTPException(status_code=404, detail="Comanda de origem não encontrada.")

        # Move os itens
        for item in source_order.items:
            item.order_id = target_order.id
            db.add(item)
            
        # Cancela a comanda de origem
        await self.cancel_order(db, order=source_order, current_user=current_user)
        
        await db.commit()
        return await get_full_order(db, id=target_order.id)
    async def get_kitchen_orders(self, db: AsyncSession, *, current_user: User) -> List[Order]:
        """
        Busca todos os pedidos ABERTOS da loja, carregando TODAS as dependências profundas
        para evitar erros de validação (422) ou MissingGreenlet (500).
        """
        # Importações necessárias para as options (coloque no topo do arquivo se preferir)
        from app.models.product import Product
        from app.models.variation import ProductVariation

        stmt = (
            select(Order)
            .where(
                Order.store_id == current_user.store_id,
                Order.status == OrderStatus.OPEN
            )
            .options(
                # 1. Carrega a mesa
                selectinload(Order.table),
                # 2. Carrega o usuário (garçom/operador)
                selectinload(Order.user),
                # 3. Carrega os itens e TUDO sobre o produto
                selectinload(Order.items).joinedload(OrderItem.product).options(
                    joinedload(Product.category),
                    joinedload(Product.subcategory),
                    joinedload(Product.supplier),
                    # Carrega variações E suas opções (ex: Tamanho -> P)
                    selectinload(Product.variations).selectinload(ProductVariation.options) 
                )
            )
            .order_by(Order.created_at)
        )
        result = await db.execute(stmt)
        return result.scalars().all()
    async def update_order_item_status(self, db: AsyncSession, *, item_id: int, new_status: str, current_user: User) -> Optional[OrderItem]:
        """
        Atualiza o status de um item específico (ex: de 'pending' para 'ready').
        """
        # Busca o item garantindo que pertence à loja do usuário
        stmt = (
            select(OrderItem)
            .join(Order)
            .where(
                OrderItem.id == item_id,
                Order.store_id == current_user.store_id
            )
        )
        result = await db.execute(stmt)
        item = result.scalars().first()
        
        if item:
            item.status = new_status
            db.add(item)
            await db.commit()
            await db.refresh(item)
        
        return item
    
    async def update_item_quantity(
        self, db: AsyncSession, *, order_id: int, item_id: int, quantity: int, current_user: User
    ) -> Order:
        """ Atualiza a quantidade de um item no pedido. """
        # 1. Busca o item
        stmt = select(OrderItem).where(OrderItem.id == item_id, OrderItem.order_id == order_id)
        result = await db.execute(stmt)
        item = result.scalars().first()
        
        if not item:
            raise HTTPException(status_code=404, detail="Item não encontrado neste pedido.")

        # 2. Calcula a diferença para o estoque
        qty_diff = quantity - item.quantity
        
        # 3. Atualiza o item
        item.quantity = quantity
        db.add(item)
        
        # 4. Atualiza estoque (se necessário)
        # Se qty_diff > 0, estamos tirando mais do estoque. Se < 0, devolvendo.
        # Nota: O stock_service deve lidar com valores negativos corretamente (devolução)
        # ou você deve chamar 'adjust_stock' ou 'deduct'. 
        # Simplificação: Assumindo que o frontend valida estoque negativo na adição.
        
        await db.commit()
        
        # Retorna o pedido completo atualizado
        return await get_full_order(db, id=order_id)

    async def remove_item_from_order(
        self, db: AsyncSession, *, order_id: int, item_id: int, current_user: User
    ) -> Order:
        """ Remove um item do pedido. """
        stmt = select(OrderItem).where(OrderItem.id == item_id, OrderItem.order_id == order_id)
        result = await db.execute(stmt)
        item = result.scalars().first()
        
        if not item:
            raise HTTPException(status_code=404, detail="Item não encontrado.")
            
        # Opcional: Devolver ao estoque aqui se o sistema reservar na adição
        
        await db.delete(item)
        await db.commit()
        
        return await get_full_order(db, id=order_id)
    

    async def hold_order(self, db: AsyncSession, *, order: Order) -> Order:
        """ Coloca a comanda em espera (Stand-by). """
        order.status = OrderStatus.ON_HOLD
        db.add(order)
        await db.commit()
        await db.refresh(order)
        return order

    async def get_held_orders(self, db: AsyncSession, *, current_user: User) -> List[Order]:
        """ Lista todas as comandas em espera da loja. """
        stmt = (
            select(Order)
            .where(
                Order.store_id == current_user.store_id,
                Order.status == OrderStatus.ON_HOLD,
                Order.order_type == OrderType.TAKEOUT # Geralmente só PDV usa hold
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
        """ Retoma uma comanda (volta para OPEN). """
        order.status = OrderStatus.OPEN
        db.add(order)
        await db.commit()
        await db.refresh(order)
        return await get_full_order(db=db, id=order.id)

# Instância global
order = CRUDOrder(Order)

    # --- FIM DAS NOVAS FUNÇÕES ---
        
order = CRUDOrder(Order)