# api/app/models/wall.py
from sqlalchemy import Integer, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional

from app.db.base import Base

class Wall(Base):
    __tablename__ = "walls"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"))

    # Posição e Dimensões
    pos_x: Mapped[int] = mapped_column(Integer, default=50)
    pos_y: Mapped[int] = mapped_column(Integer, default=50)
    width: Mapped[int] = mapped_column(Integer, default=200) # Largura padrão
    height: Mapped[int] = mapped_column(Integer, default=10) # Altura padrão (espessura da parede)

    # Rotação
    rotation: Mapped[int] = mapped_column(Integer, default=0)

    # Opcional: Tipo de parede (ex: 'standard', 'window', 'door')
    wall_type: Mapped[Optional[str]] = mapped_column(String(50), default='standard')

    store: Mapped["Store"] = relationship()