# api/app/models/ingredient.py
from sqlalchemy import String, Float, Enum as SQLAlchemyEnum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.schemas.enums import UnitOfMeasure
from app.db.base import Base

class Ingredient(Base):
    __tablename__ = "ingredients"
    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"), nullable=False)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    stock: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    # CORREÇÃO: create_type=False
    unit_of_measure: Mapped[UnitOfMeasure] = mapped_column(SQLAlchemyEnum(UnitOfMeasure, name='unitofmeasure', create_type=False), nullable=False)