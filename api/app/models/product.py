# /api/app/models/product.py
from sqlalchemy import String, Float, Integer, DateTime, func, ForeignKey, Enum as SQLAlchemyEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import List, Optional
import enum # Importar enum

from app.db.base import Base
# Importar modelos relacionados
from .category import ProductCategory, ProductSubcategory
from .batch import ProductBatch
from .variation import ProductVariation
from .recipe import RecipeItem
from .supplier import Supplier # <-- Adicionar import Supplier

# --- Adicionar Enum para Tipo de Produto ---
class ProductType(str, enum.Enum):
    SIMPLE = "SIMPLE"       # Produto padrão
    COMPOSED = "COMPOSED"   # Produto com receita (ficha técnica)
    VARIATION = "VARIATION" # Produto que É uma variação (geralmente não usado diretamente, mas sim ProductVariation)

class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255))
    price: Mapped[float] = mapped_column(Float, nullable=False)

    # --- NOVO CAMPO: Preço de Custo ---
    cost_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    # --- FIM NOVO CAMPO ---

    stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0) # Default 0
    low_stock_threshold: Mapped[int] = mapped_column(Integer, nullable=False, default=10, server_default="10")

    image_url: Mapped[Optional[str]] = mapped_column(String(500))
    barcode: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True)

    # --- NOVO CAMPO: Tipo de Produto ---
    product_type: Mapped[ProductType] = mapped_column(SQLAlchemyEnum(ProductType, name="producttype", create_type=False), default=ProductType.SIMPLE, server_default=ProductType.SIMPLE.value)
    # --- FIM NOVO CAMPO ---

    # --- Chaves Estrangeiras ---
    category_id: Mapped[Optional[int]] = mapped_column(ForeignKey("product_categories.id"))
    subcategory_id: Mapped[Optional[int]] = mapped_column(ForeignKey("product_subcategories.id"))
    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"), nullable=False)
    # --- NOVA FK: Fornecedor ---
    supplier_id: Mapped[Optional[int]] = mapped_column(ForeignKey("suppliers.id"), nullable=True)
    # --- FIM NOVA FK ---

    # --- Relações ---
    category: Mapped[Optional["ProductCategory"]] = relationship(lazy="selectin")
    subcategory: Mapped[Optional["ProductSubcategory"]] = relationship(lazy="selectin")
    # --- NOVA RELAÇÃO: Fornecedor ---
    supplier: Mapped[Optional["Supplier"]] = relationship(lazy="selectin")
    # --- FIM NOVA RELAÇÃO ---

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    batches: Mapped[List["ProductBatch"]] = relationship(back_populates="product", cascade="all, delete-orphan", lazy="selectin")
    variations: Mapped[List["ProductVariation"]] = relationship(back_populates="product", cascade="all, delete-orphan", lazy="selectin")
    recipe_items: Mapped[List["RecipeItem"]] = relationship(lazy="selectin") # Ingredientes se for COMPOSTO