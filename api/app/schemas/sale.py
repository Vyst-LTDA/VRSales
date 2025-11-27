# api/app/schemas/sale.py
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime

from .sale_item import SaleItem, SaleItemCreate
from .payment import PaymentCreate, Payment as PaymentSchema
from .user import User
from .customer import Customer

# =====================================================================================
# Schema Base e de Criação
# =====================================================================================
class SaleBase(BaseModel):
    total_amount: float = Field(..., gt=0, description="Valor total da venda.")
    customer_id: Optional[int] = None

class SaleCreate(SaleBase):
    items: List[SaleItemCreate]
    payments: List[PaymentCreate]
    # --- CORREÇÃO: Campo Novo ---
    order_id: Optional[int] = None 
    # ----------------------------

class SaleUpdate(BaseModel):
    pass

# =====================================================================================
# Schema para Leitura/Retorno da Venda
# =====================================================================================
class Sale(SaleBase):
    id: int
    user_id: int
    created_at: datetime
    payment_method: str 

    items: List[SaleItem] = []
    user: Optional[User] = None
    customer: Optional[Customer] = None
    payments: List[PaymentSchema] = []

    model_config = ConfigDict(from_attributes=True)