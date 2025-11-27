# api/app/crud/crud_product.py
from sqlalchemy.orm import Session, selectinload, joinedload
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import or_
from typing import List, Any, Dict, Union, Optional
from app.models.user import User as UserModel

from app.crud.base import CRUDBase
from app.models.product import Product
# --- IMPORTAÇÃO NECESSÁRIA PARA O CARREGAMENTO ANINHADO ---
from app.models.category import ProductCategory 
# ----------------------------------------------------------
from app.schemas.product import ProductCreate, ProductUpdate

class CRUDProduct(CRUDBase[Product, ProductCreate, ProductUpdate]):

    async def _get_product_with_relations(self, db: AsyncSession, product_id: int) -> Product | None:
        """Método auxiliar para buscar um produto com seus relacionamentos."""
        statement = (
            select(Product)
            .where(Product.id == product_id)
            .options(
                selectinload(Product.variations),
                # --- CORREÇÃO: Carrega Categoria E suas Subcategorias ---
                selectinload(Product.category).selectinload(ProductCategory.subcategories),
                # --------------------------------------------------------
                joinedload(Product.subcategory),
                joinedload(Product.supplier)
            )
        )
        result = await db.execute(statement)
        return result.scalars().first()

    async def get(self, db: AsyncSession, id: Any, *, current_user: UserModel) -> Product | None:
        """Obtém um produto pelo ID, garantindo que pertence à loja do usuário."""
        product = await self._get_product_with_relations(db, id)
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
        category_id: Optional[int] = None,
        supplier_id: Optional[int] = None
    ) -> List[Product]:
        """ Obtém uma lista de produtos da loja do usuário, com filtros opcionais. """
        statement = (
            select(self.model)
            .where(self.model.store_id == current_user.store_id if current_user.role != 'super_admin' else True)
            .options(
                selectinload(self.model.variations),
                # --- CORREÇÃO: Carrega Categoria E suas Subcategorias ---
                selectinload(self.model.category).selectinload(ProductCategory.subcategories),
                # --------------------------------------------------------
                joinedload(self.model.subcategory),
                joinedload(self.model.supplier)
            )
            .order_by(self.model.name)
        )

        if search:
            statement = statement.where(
                or_(
                    self.model.name.ilike(f"%{search}%"),
                    self.model.barcode.ilike(f"{search}%")
                )
            )
        if category_id:
            statement = statement.where(self.model.category_id == category_id)
        if supplier_id:
            statement = statement.where(self.model.supplier_id == supplier_id)

        statement = statement.offset(skip).limit(limit)

        result = await db.execute(statement)
        return result.scalars().all()

    async def create(self, db: AsyncSession, *, obj_in: ProductCreate, current_user: UserModel) -> Product:
        product_data = obj_in.model_dump()
        expiration_date = product_data.pop("expiration_date", None)
        initial_stock = product_data.get("stock", 0)
        
        if current_user.role != 'super_admin':
            product_data['store_id'] = current_user.store_id
            
        db_product = Product(**product_data)
        db.add(db_product)
        await db.flush()

        if expiration_date and initial_stock > 0:
            from app.models.batch import ProductBatch
            new_batch = ProductBatch(
                product_id=db_product.id,
                store_id=db_product.store_id,
                quantity=initial_stock,
                expiration_date=expiration_date
            )
            db.add(new_batch)

        await db.commit()
        await db.refresh(db_product)
        
        return await self._get_product_with_relations(db, db_product.id)

    async def update(
        self, db: AsyncSession, *, db_obj: Product, obj_in: Union[ProductUpdate, Dict[str, Any]], current_user: UserModel
    ) -> Product:
        await super().update(db=db, db_obj=db_obj, obj_in=obj_in, current_user=current_user)
        return await self._get_product_with_relations(db, db_obj.id)

product = CRUDProduct(Product)