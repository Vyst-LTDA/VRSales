# api/app/crud/crud_product.py
from sqlalchemy.orm import Session, selectinload, joinedload
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession # <-- ADICIONE ESTA LINHA
from typing import List, Any, Dict, Union, Optional
from app.models.user import User as UserModel

from app.crud.base import CRUDBase
from app.models.product import Product
from app.models.supplier import Supplier # <-- Importar Supplier
from app.schemas.product import ProductCreate, ProductUpdate
from fastapi.encoders import jsonable_encoder

class CRUDProduct(CRUDBase[Product, ProductCreate, ProductUpdate]):

    async def _get_product_with_relations(self, db: AsyncSession, product_id: int) -> Product | None:
        """Método auxiliar para buscar um produto com seus relacionamentos."""
        statement = (
            select(Product)
            .where(Product.id == product_id)
            .options(
                selectinload(Product.variations), # Mantido
                joinedload(Product.category),     # Mantido
                joinedload(Product.subcategory), # Mantido
                joinedload(Product.supplier)      # <-- ADICIONADO Supplier
                # selectinload(Product.recipe_items).selectinload(RecipeItem.ingredient) # Adicionar depois para receitas
            )
        )
        result = await db.execute(statement)
        return result.scalars().first()

    async def get(self, db: AsyncSession, id: Any, *, current_user: UserModel) -> Product | None:
        """Obtém um produto pelo ID, garantindo que pertence à loja do usuário."""
        product = await self._get_product_with_relations(db, id)
        # A verificação de store_id já acontece na CRUDBase.get, mas podemos manter por clareza.
        if product and (product.store_id == current_user.store_id or current_user.role == 'super_admin'):
             return product
        return None

    async def get_multi(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        current_user: UserModel,
        search: Optional[str] = None,
        category_id: Optional[int] = None, # <-- NOVO Filtro
        supplier_id: Optional[int] = None  # <-- NOVO Filtro
    ) -> List[Product]:
        """ Obtém uma lista de produtos da loja do usuário, com filtros opcionais. """
        statement = (
            select(self.model)
            .where(self.model.store_id == current_user.store_id if current_user.role != 'super_admin' else True) # Permite super_admin ver tudo
            .options(
                selectinload(self.model.variations),
                joinedload(self.model.category),
                joinedload(self.model.subcategory),
                joinedload(self.model.supplier) # <-- Carrega Supplier para a lista
            )
            .order_by(self.model.name)
        )

        if search:
            statement = statement.where(self.model.name.ilike(f"%{search}%"))
        if category_id:
            statement = statement.where(self.model.category_id == category_id)
        if supplier_id:
            statement = statement.where(self.model.supplier_id == supplier_id)

        statement = statement.offset(skip).limit(limit)

        result = await db.execute(statement)
        return result.scalars().all()

    async def create(self, db: AsyncSession, *, obj_in: ProductCreate, current_user: UserModel) -> Product:
        """ Cria um novo produto e o retorna com relacionamentos carregados. """
        # CRUDBase.create lida com store_id e campos básicos
        db_obj = await super().create(db=db, obj_in=obj_in, current_user=current_user)
        # Recarrega com relações após criar
        return await self._get_product_with_relations(db, db_obj.id)

    async def update(
        self, db: AsyncSession, *, db_obj: Product, obj_in: Union[ProductUpdate, Dict[str, Any]], current_user: UserModel
    ) -> Product:
        """ Atualiza um produto e o retorna com relacionamentos carregados. """
        # CRUDBase.update aplica as mudanças
        await super().update(db=db, db_obj=db_obj, obj_in=obj_in, current_user=current_user)
        # Recarrega com relações após atualizar
        return await self._get_product_with_relations(db, db_obj.id)


product = CRUDProduct(Product)