# api/app/models/table.py
from sqlalchemy import String, DateTime, func, Boolean, ForeignKey, Integer, Enum as SQLAlchemyEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional, List

from app.db.base import Base
from app.schemas.enums import TableShape, TableStatus # Importar Enums

class Table(Base):
    __tablename__ = "tables"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    number: Mapped[str] = mapped_column(String(50), nullable=False)
    # CORREÇÃO: Usar o Enum TableStatus e create_type=False
    status: Mapped[TableStatus] = mapped_column(SQLAlchemyEnum(TableStatus, name='tablestatus', create_type=False), default=TableStatus.AVAILABLE)
    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"))

    pos_x: Mapped[Optional[int]] = mapped_column(Integer, default=0)
    pos_y: Mapped[Optional[int]] = mapped_column(Integer, default=0)

    # --- NOVAS COLUNAS ---
    capacity: Mapped[int] = mapped_column(Integer, default=4, server_default="4") # server_default OK para Integer
    # CORREÇÕES: create_type=False, remover server_default
    shape: Mapped[TableShape] = mapped_column(SQLAlchemyEnum(TableShape, name="tableshape", create_type=False), default=TableShape.RECTANGLE)
    rotation: Mapped[int] = mapped_column(Integer, default=0, server_default="0") # server_default OK para Integer
    # --- FIM ---

    store: Mapped["Store"] = relationship()
    # Garanta que o modelo 'Order' importe 'Table' se usar string aqui
    orders: Mapped[List["Order"]] = relationship(back_populates="table")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())