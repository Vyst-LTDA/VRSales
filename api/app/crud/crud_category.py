# api/app/crud/crud_category.py
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.crud.base import CRUDBase
from app.models.category import ProductCategory
from app.schemas.category import ProductCategoryCreate, ProductCategoryUpdate
from app.models.user import User

class CRUDCategory(CRUDBase[ProductCategory, ProductCategoryCreate, ProductCategoryUpdate]):
    
    async def create(self, db: AsyncSession, *, obj_in: ProductCategoryCreate, current_user: User) -> ProductCategory:
        """
        Cria uma categoria e recarrega ela do banco para garantir 
        que a lista 'subcategories' esteja inicializada (evitando MissingGreenlet).
        """
        # 1. Cria usando a lógica padrão do CRUDBase
        db_obj = await super().create(db, obj_in=obj_in, current_user=current_user)
        
        # 2. Recarrega o objeto usando o método get() que já tem o selectinload configurado
        return await self.get(db, id=db_obj.id, current_user=current_user)

    async def get(self, db: AsyncSession, id: int, *, current_user: User) -> Optional[ProductCategory]:
        """ Busca categoria com subcategorias carregadas. """
        stmt = select(self.model).where(self.model.id == id)
        
        if current_user.role != 'super_admin':
            stmt = stmt.where(self.model.store_id == current_user.store_id)
            
        # Carregamento Ansioso (Eager Loading) para evitar erro no Pydantic
        stmt = stmt.options(selectinload(self.model.subcategories))
        
        result = await db.execute(stmt)
        return result.scalars().first()

    async def get_multi(
        self, db: AsyncSession, *, skip: int = 0, limit: int = 100, current_user: User
    ) -> List[ProductCategory]:
        """ Lista categorias com subcategorias carregadas. """
        stmt = select(self.model)
        
        if current_user.role != 'super_admin':
            stmt = stmt.where(self.model.store_id == current_user.store_id)
        
        # Carregamento Ansioso
        stmt = stmt.options(selectinload(self.model.subcategories))
        
        stmt = stmt.offset(skip).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()

# Instância exportada para uso nos endpoints
category = CRUDCategory(ProductCategory)