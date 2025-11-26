# api/app/schemas/product.py
from pydantic import Field, validator, ConfigDict
from typing import Optional, List
from datetime import datetime
import enum # Import enum

# Importa schemas relacionados
from .base_schema import BaseSchema
from .category import ProductCategory, ProductSubcategory # Já importados
from .variation import ProductVariation # Já importado
from .supplier import Supplier as SupplierSchema # <-- Importar schema do Supplier

# --- Adicionar Enum ProductType aqui também ---
class ProductType(str, enum.Enum):
    SIMPLE = "SIMPLE"
    COMPOSED = "COMPOSED"
    VARIATION = "VARIATION" # Mantido por consistência, embora talvez não usado diretamente

# =====================================================================================
# Schema Base para Produto
# =====================================================================================
class ProductBase(BaseSchema):
    name: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    price: float = Field(..., ge=0) # ge=0 permite preço zero, gt=0 exige > 0
    cost_price: Optional[float] = Field(None, ge=0, description="Preço de custo do produto.") # <-- NOVO
    stock: int = Field(...) # Permitir estoque negativo foi feito no stock_service
    low_stock_threshold: int = Field(10, ge=0)
    image_url: Optional[str] = Field(None, max_length=500)
    barcode: Optional[str] = Field(None, max_length=100, index=True)
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    supplier_id: Optional[int] = Field(None, description="ID do fornecedor principal.") # <-- NOVO
    product_type: ProductType = Field(default=ProductType.SIMPLE, description="Tipo do produto.") # <-- NOVO

    # Validator mantido
    @validator('name', pre=True, always=True)
    def name_must_not_be_empty(cls, value):
        if isinstance(value, str) and not value.strip():
            raise ValueError('O nome do produto não pode ser vazio.')
        return value

# =====================================================================================
# Schema para Criação de Produto
# =====================================================================================
class ProductCreate(ProductBase):
    pass # Herda tudo

# =====================================================================================
# Schema para Atualização de Produto
# =====================================================================================
class ProductUpdate(BaseSchema): # Herda de BaseSchema para ter validações base
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    price: Optional[float] = Field(None, ge=0)
    cost_price: Optional[float] = Field(None, ge=0) # <-- NOVO
    stock: Optional[int] = None
    low_stock_threshold: Optional[int] = Field(None, ge=0)
    image_url: Optional[str] = Field(None, max_length=500)
    barcode: Optional[str] = Field(None, max_length=100)
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    supplier_id: Optional[int] = None # <-- NOVO
    product_type: Optional[ProductType] = None # <-- NOVO

# =====================================================================================
# Schema para Leitura/Retorno de Produto da API
# =====================================================================================
class Product(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime

    # Relacionamentos (carregados via ORM com eager loading)
    category: Optional[ProductCategory] = None
    subcategory: Optional[ProductSubcategory] = None
    supplier: Optional[SupplierSchema] = None # <-- NOVO
    variations: List[ProductVariation] = []
    # recipe_items: List[RecipeItemSchema] = [] # Adicionar se/quando implementar receitas

    model_config = ConfigDict(from_attributes=True)