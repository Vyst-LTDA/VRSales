from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import Optional
from sqlalchemy.orm import selectinload
from app.crud.base import CRUDBase
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash, verify_password

class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    async def get_by_email(self, db: AsyncSession, *, email: str) -> Optional[User]:
        # --- ALTERADO PARA CARREGAR A LOJA JUNTO (selectinload) ---
        result = await db.execute(
            select(User)
            .options(selectinload(User.store))
            .filter(User.email == email)
        )
        return result.scalars().first()

    async def authenticate(
        self, db: AsyncSession, *, email: str, password: str
    ) -> Optional[User]:
        user = await self.get_by_email(db, email=email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    # --- INÍCIO DA CORREÇÃO ---
    # A assinatura do método foi atualizada para aceitar 'current_user',
    # mesmo que ele possa ser 'None' (como no caso da criação do primeiro super_admin).
    async def create(self, db: AsyncSession, *, obj_in: UserCreate, current_user: Optional[User] = None) -> User:
        # A lógica de criação permanece a mesma, focada em hashear a senha
        # e criar o objeto User corretamente.
        db_obj = User(
            email=obj_in.email,
            hashed_password=get_password_hash(obj_in.password),
            full_name=obj_in.full_name,
            is_active=True,  # Usuários são criados como ativos por padrão
            role=obj_in.role,
            store_id=obj_in.store_id
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj
    # --- FIM DA CORREÇÃO ---

    async def get_count(self, db: AsyncSession) -> int:
        """Retorna o número total de usuários no banco de dados."""
        result = await db.execute(select(func.count()).select_from(User))
        return result.scalar_one()

user = CRUDUser(User)