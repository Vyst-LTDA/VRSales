# api/app/schemas/order.py
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

from app.schemas.enums import OrderType, OrderStatus, OrderItemStatus
from app.schemas.product import Product
from app.schemas.user import User
from .payment import PaymentCreate
from .table import Table as TableSchema

# --- Schemas de Pagamento Parcial ---
class PartialPaymentItem(BaseModel):
    order_item_id: int = Field(..., description="ID do item da comanda (OrderItem).")
    quantity: int = Field(..., gt=0, description="Quantidade deste item que está sendo paga.")

class PartialPaymentRequest(BaseModel):
    items_to_pay: List[PartialPaymentItem]
    payments: List[PaymentCreate]
    customer_id: Optional[int] = None

# --- Schemas de Itens de Pedido ---
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

# --- Schemas de Pedido (Order) ---
class OrderBase(BaseModel):
    order_type: OrderType
    customer_id: Optional[int] = None
    table_id: Optional[int] = None
    delivery_address: Optional[str] = None

class OrderCreate(OrderBase):
    # --- CORREÇÃO AQUI: Adicionado campo items opcional ---
    items: List[OrderItemCreate] = []

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

# --- Outros Schemas ---
class OrderItemStatusUpdate(BaseModel):
    status: OrderItemStatus

class OrderTransfer(BaseModel):
    target_table_id: int

class OrderMerge(BaseModel):
    source_order_id: int