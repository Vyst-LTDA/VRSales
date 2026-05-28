from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud
from app.api import dependencies
from app.core import security
from app.schemas.token_schema import Token

router = APIRouter()

@router.post("/token", response_model=Token)
async def login_access_token(
    db: AsyncSession = Depends(dependencies.get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Any:
    
    user = await crud.user.authenticate(
        db, email=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(status_code=400, detail="E-mail ou senha incorretos")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Usuário inativo")
    
    # --- NOVA VERIFICAÇÃO DE LOJA INATIVA ADICIONADA AQUI ---
    if user.store_id is not None and user.store is not None:
        if not user.store.is_active:
            raise HTTPException(
                status_code=403, 
                detail="Esta loja foi inativada por pendências. Por favor, entre em contato com financeiro@seudominio.com.br"
            )
    # --------------------------------------------------------
    
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    token_data = {"sub": str(user.id)}
    
    return {
        "access_token": security.create_access_token(
            data=token_data, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }