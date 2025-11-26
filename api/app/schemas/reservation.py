# api/app/schemas/reservation.py
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# Importa o schema da Mesa para incluir detalhes na resposta
from .table import Table as TableSchema

class ReservationBase(BaseModel):
    customer_name: str = Field(..., min_length=2, max_length=150)
    phone_number: Optional[str] = None
    reservation_time: datetime # Espera um objeto datetime Python
    number_of_people: int = Field(..., gt=0) # Garante que seja maior que 0
    notes: Optional[str] = None
    table_id: int # ID da mesa é obrigatório

class ReservationCreate(ReservationBase):
    # Schema usado para criar a reserva, herda todos os campos da Base
    pass

class ReservationUpdate(BaseModel):
    # Schema para atualizações (não usado na criação)
    customer_name: Optional[str] = Field(None, min_length=2, max_length=150)
    phone_number: Optional[str] = None
    reservation_time: Optional[datetime] = None
    number_of_people: Optional[int] = Field(None, gt=0)
    notes: Optional[str] = None
    table_id: Optional[int] = None
    status: Optional[str] = None

class Reservation(ReservationBase):
    # Schema completo retornado pela API após criação ou leitura
    id: int
    store_id: int
    status: str
    created_at: datetime
    table: TableSchema # Inclui os detalhes da mesa relacionada

    class Config:
        from_attributes = True # Necessário para Pydantic V2+