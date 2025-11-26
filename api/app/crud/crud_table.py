# api/app/crud/crud_table.py
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.crud.base import CRUDBase
from app.models.table import Table
from app.models.user import User
from app.schemas.table import TableCreate, TableUpdate, TableLayoutUpdate
class CRUDTable(CRUDBase[Table, TableCreate, TableUpdate]):
    """
    Operações CRUD para Mesas, herdando a funcionalidade padrão da CRUDBase.
    """
    async def update_layout(self, db: AsyncSession, *, tables_layout: List[TableLayoutUpdate], current_user: User) -> List[Table]:
        # Esta função já espera a lista corretamente
        updated_tables = []
        for table_update in tables_layout:
            db_table = await self.get(db, id=table_update.id, current_user=current_user)
            if db_table:
                updated_table = await self.update(db=db, db_obj=db_table, obj_in=table_update, current_user=current_user)
                updated_tables.append(updated_table)
        # Atenção: O commit ocorre dentro de cada chamada self.update.
        # Se precisar de uma única transação, a lógica precisaria ser ajustada aqui.
        return updated_tables

table = CRUDTable(Table)