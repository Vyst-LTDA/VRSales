# api/app/api/endpoints/reservations.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Any
from datetime import datetime

# Importa o módulo crud e os schemas/modelos necessários
from app import crud
from app.models.user import User as UserModel
from app.schemas.reservation import Reservation, ReservationCreate, ReservationUpdate
from app.api.dependencies import get_db, get_current_active_user

router = APIRouter()

@router.get("/", response_model=List[Reservation])
async def read_reservations(
    *,
    db: AsyncSession = Depends(get_db),
    # Parâmetros de query para filtrar por data
    start_date: datetime,
    end_date: datetime,
    current_user: UserModel = Depends(get_current_active_user)
) -> Any:
    """
    Lista as reservas num determinado intervalo de datas para a loja do usuário.
    """
    reservations = await crud.reservation.get_reservations_by_date_range(
        db=db, start_date=start_date, end_date=end_date, current_user=current_user
    )
    return reservations

@router.post("/", response_model=Reservation, status_code=status.HTTP_201_CREATED)
async def create_reservation(
    *,
    db: AsyncSession = Depends(get_db),
    # Usa o schema ReservationCreate para validar o corpo da requisição
    reservation_in: ReservationCreate,
    current_user: UserModel = Depends(get_current_active_user)
) -> Any:
    """
    Cria uma nova reserva. Valida a mesa e seu status no CRUD.
    """
    # Chama a função create do crud.reservation
    # O Pydantic já validou o reservation_in contra o schema ReservationCreate
    # Se a data/hora não puder ser parseada, o erro 422 acontece aqui antes de chamar o CRUD.
    try:
        return await crud.reservation.create(db=db, obj_in=reservation_in, current_user=current_user)
    except HTTPException as e:
        # Repassa exceções HTTP geradas pelo CRUD (ex: mesa não encontrada ou ocupada)
        raise e
    except ValueError as e:
        # Captura outros erros de valor que podem ocorrer (embora menos provável aqui)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        # Captura genérica para outros erros inesperados durante a criação
        print(f"Erro inesperado ao criar reserva: {e}") # Logar o erro seria ideal
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro interno ao criar a reserva.")


@router.delete("/{reservation_id}", response_model=Reservation)
async def delete_reservation(
    *,
    db: AsyncSession = Depends(get_db),
    reservation_id: int,
    current_user: UserModel = Depends(get_current_active_user)
) -> Any:
    """
    Cancela/apaga uma reserva e libera a mesa.
    """
    # Busca a reserva antes de tentar remover (para garantir que pertence ao usuário/loja)
    reservation_to_delete = await crud.reservation.get(db, id=reservation_id, current_user=current_user)
    if not reservation_to_delete:
        raise HTTPException(status_code=404, detail="Reserva não encontrada.")

    # Chama a função remove do crud.reservation
    deleted_reservation = await crud.reservation.remove(db=db, id=reservation_id, current_user=current_user)
    if not deleted_reservation:
         # Se chegou aqui, algo deu errado na remoção após a verificação inicial
         raise HTTPException(status_code=500, detail="Erro ao remover a reserva após verificação inicial.")
    return deleted_reservation