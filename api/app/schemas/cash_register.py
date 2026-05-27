from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class CashRegisterBase(BaseModel):
    opening_balance: float

class CashRegisterOpen(CashRegisterBase):
    opening_balance: float = Field(..., gt=0, description="Valor de abertura do caixa.")

class CashRegisterClose(CashRegisterBase):
    # O valor de fechamento será informado pelo frontend, e o backend validará
    closing_balance: float = Field(..., ge=0, description="Valor de fechamento contado no caixa.")

class CashRegisterSession(CashRegisterBase):
    id: int
    user_id: int
    opening_balance: float
    closing_balance: Optional[float] = None
    opened_at: datetime
    closed_at: Optional[datetime] = None
    is_open: bool

    class Config:
        from_attributes = True

class CashRegisterClose(BaseModel):
    closing_balance: float = Field(..., ge=0, description="Valor físico contado na gaveta ao fechar o caixa.")

class CashRegisterStatus(CashRegisterSession):
    """ Schema para o status do caixa, incluindo o total de vendas na sessão. """
    total_sales: float
    expected_balance: float

class CashRegister(CashRegisterBase):
    id: int
    status: str # Ou o Enum apropriado
    opened_at: datetime
    closed_at: Optional[datetime]


    class Config:
        orm_mode = True

        # Schema para a CRUDBase usar na criação
class CashRegisterCreate(CashRegisterBase):
    pass

# Schema para a CRUDBase usar na atualização (geralmente não se atualiza um caixa, mas é bom ter)
class CashRegisterUpdate(BaseModel):
    status: Optional[CashRegisterStatus] = None
    closing_balance: Optional[float] = None

class CashRegisterClose(BaseModel):
    closing_balance: float