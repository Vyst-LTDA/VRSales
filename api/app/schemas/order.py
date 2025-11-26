# api/app/schemas/order.py
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# --- INÍCIO DA CORREÇÃO ---
# Importa o OrderItemStatus que será usado no novo schema
from app.schemas.enums import OrderType, OrderStatus, OrderItemStatus
# --- FIM DA CORREÇÃO ---

from app.schemas.product import Product
from app.schemas.user import User
from .payment import PaymentCreate
from .table import Table as TableSchema
from .table import SimpleTable as TableSchema

class PartialPaymentItem(BaseModel):
    """Define um item e a quantidade a ser paga em um pagamento parcial."""
    order_item_id: int = Field(..., description="ID do item da comanda (OrderItem).")
    quantity: int = Field(..., gt=0, description="Quantidade deste item que está sendo paga.")

class PartialPaymentRequest(BaseModel):
    """Corpo da requisição para um pagamento parcial de comanda."""
    items_to_pay: List[PartialPaymentItem]
    payments: List[PaymentCreate]
    customer_id: Optional[int] = None

class OrderItemBase(BaseModel):
    product_id: int
    quantity: int
    notes: Optional[str] = None

class OrderItemCreate(OrderItemBase):
    pass

class OrderItem(OrderItemBase):
    id: int
    price_at_order: float
    product: Optional[Product] = None
    paid_quantity: int
    status: Optional[OrderItemStatus] = None
    
    class Config:
        from_attributes = True

class OrderBase(BaseModel):
    order_type: OrderType
    customer_id: Optional[int] = None
    table_id: Optional[int] = None
    delivery_address: Optional[str] = None

class OrderCreate(OrderBase):
    pass

class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    customer_id: Optional[int] = None

class Order(OrderBase):
    id: int
    status: OrderStatus
    created_at: datetime
    user: Optional[User] = None
    items: List[OrderItem] = []
    table: Optional[TableSchema] = None
    
    class Config:
        from_attributes = True

# --- INÍCIO DA CRIAÇÃO DOS SCHEMAS FALTANTES ---

class OrderItemStatusUpdate(BaseModel):
    """Schema para atualizar o status de um item de pedido (usado pelo KDS)."""
    status: OrderItemStatus

class OrderTransfer(BaseModel):
    """Schema para a requisição de transferência de uma comanda para outra mesa."""
    target_table_id: int

class OrderMerge(BaseModel):
    """Schema para a requisição de junção de uma comanda em outra."""
    source_order_id: int

# --- FIM DA CRIAÇÃO ---