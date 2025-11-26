# api/app/crud/crud_wall.py
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.crud.base import CRUDBase
from app.models.wall import Wall # Importa o novo modelo Wall
from app.models.user import User
from app.schemas.wall import WallCreate, WallUpdate, WallLayoutUpdate # Importa os schemas Wall

class CRUDWall(CRUDBase[Wall, WallCreate, WallUpdate]):
    """
    Operações CRUD para Paredes (Walls), herdando a funcionalidade padrão da CRUDBase.
    """
    async def update_layout(self, db: AsyncSession, *, walls_layout: List[WallLayoutUpdate], current_user: User) -> List[Wall]:
        updated_walls = []
        for wall_update in walls_layout:
            # Busca a parede garantindo que pertence à loja do usuário (se não for super_admin)
            db_wall = await self.get(db, id=wall_update.id, current_user=current_user)
            if db_wall:
                # O Pydantic model 'WallLayoutUpdate' pode ser passado diretamente
                # O método 'update' da CRUDBase já aplica os campos corretos
                updated_wall = await self.update(
                    db=db,
                    db_obj=db_wall,
                    obj_in=wall_update, # Passa o objeto de layout diretamente
                    current_user=current_user
                )
                updated_walls.append(updated_wall)
        # O commit é feito dentro do método 'update' da CRUDBase
        # Se precisar de transação única para todas as paredes, a lógica do update_layout precisaria mudar
        return updated_walls

# Exporta uma instância
wall = CRUDWall(Wall)