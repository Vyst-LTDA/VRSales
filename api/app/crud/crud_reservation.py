# api/app/crud/crud_reservation.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timezone, timedelta

from fastapi import HTTPException, status

from app.crud.base import CRUDBase
from app.models.reservation import Reservation
from app.models.user import User
from app.models.table import Table
from app.schemas.enums import TableStatus
from app.schemas.reservation import ReservationCreate, ReservationUpdate

class CRUDReservation(CRUDBase[Reservation, ReservationCreate, ReservationUpdate]):

    async def cleanup_expired_reservations(self, db: AsyncSession, current_user: User):
        """
        Verifica reservas passadas, libera as mesas e exclui os registros.
        """
        now = datetime.now(timezone.utc)
        
        stmt = select(self.model).where(
            self.model.store_id == current_user.store_id,
            self.model.reservation_time < now
        ).options(selectinload(self.model.table))
        
        result = await db.execute(stmt)
        expired_reservations = result.scalars().all()

        for reservation in expired_reservations:
            if reservation.table and reservation.table.status == TableStatus.RESERVED:
                reservation.table.status = TableStatus.AVAILABLE
                db.add(reservation.table)
            
            await db.delete(reservation)
        
        if expired_reservations:
            await db.commit()

    # --- NOVA FUNÇÃO: Ativa reservas do dia ---
    async def ensure_todays_reservations_are_active(self, db: AsyncSession, current_user: User):
        """
        Verifica se existem reservas para HOJE em mesas que ainda estão como 'DISPONÍVEL'.
        Se houver, muda o status da mesa para 'RESERVADA'.
        """
        now = datetime.now(timezone.utc)
        end_of_day = now.replace(hour=23, minute=59, second=59)
        
        # Busca reservas de hoje (do momento atual até o fim do dia)
        stmt = select(self.model).where(
            self.model.store_id == current_user.store_id,
            self.model.reservation_time >= now,
            self.model.reservation_time <= end_of_day
        ).options(selectinload(self.model.table))
        
        result = await db.execute(stmt)
        todays_reservations = result.scalars().all()
        
        updated = False
        for reservation in todays_reservations:
            if reservation.table and reservation.table.status == TableStatus.AVAILABLE:
                reservation.table.status = TableStatus.RESERVED
                db.add(reservation.table)
                updated = True
        
        if updated:
            await db.commit()
    # ------------------------------------------

    async def get_reservations_by_date_range(
        self, db: AsyncSession, *, start_date: datetime, end_date: datetime, current_user: User
    ) -> List[Reservation]:
        await self.cleanup_expired_reservations(db, current_user)

        stmt = (
            select(self.model)
            .where(
                self.model.store_id == current_user.store_id,
                self.model.reservation_time >= start_date,
                self.model.reservation_time <= end_date,
            )
            .options(selectinload(self.model.table))
            .order_by(self.model.reservation_time)
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    async def create(self, db: AsyncSession, *, obj_in: ReservationCreate, current_user: User) -> Reservation:
        res_time = obj_in.reservation_time
        if res_time.tzinfo is None:
            res_time = res_time.replace(tzinfo=timezone.utc)
        
        if res_time < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não é possível criar reservas para datas ou horários passados."
            )

        table = await db.get(Table, obj_in.table_id)

        if not table or table.store_id != current_user.store_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mesa não encontrada ou não pertence a esta loja."
            )

        # --- LÓGICA MODIFICADA ---
        # Verifica se a reserva é para "hoje"
        is_today = res_time.date() == datetime.now(timezone.utc).date()

        if is_today:
            # Se for para hoje, a mesa PRECISA estar livre agora
            if table.status != TableStatus.AVAILABLE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"A mesa {table.number} não está disponível para reserva HOJE (Status: {table.status})."
                )
            # Bloqueia a mesa imediatamente
            table.status = TableStatus.RESERVED
            db.add(table)
        else:
            # Se for para data futura, permitimos criar mesmo que a mesa esteja ocupada AGORA (por outro cliente),
            # e NÃO mudamos o status da mesa para RESERVED ainda.
            pass
        # -------------------------

        db_obj = await super().create(db=db, obj_in=obj_in, current_user=current_user)
        await db.refresh(db_obj, attribute_names=["table"])

        return db_obj

    async def remove(self, db: AsyncSession, *, id: int, current_user: User) -> Optional[Reservation]:
        stmt = select(self.model).where(self.model.id == id).options(selectinload(self.model.table))
        result = await db.execute(stmt)
        db_obj = result.scalars().first()

        if db_obj:
            if db_obj.store_id != current_user.store_id:
                return None

            if db_obj.table:
                # Só libera a mesa se o status for RESERVED. 
                # Se estiver OCCUPIED (cliente chegou), não mexe.
                if db_obj.table.status == TableStatus.RESERVED:
                    db_obj.table.status = TableStatus.AVAILABLE
                    db.add(db_obj.table)

            await db.delete(db_obj)
            await db.commit()

        return db_obj

reservation = CRUDReservation(Reservation)