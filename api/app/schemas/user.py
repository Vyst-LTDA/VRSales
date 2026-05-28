from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from app.schemas.enums import UserRole
from datetime import datetime

class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = True
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    store_id: Optional[int] = Field(None, description="ID da loja à qual o usuário pertence.")

class UserChangePassword(BaseModel):
    current_password: str
    new_password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str
    role: UserRole
    # Tornando store_id obrigatório para a criação de usuários que não sejam SUPER_ADMIN
    # A lógica de validação pode ficar no endpoint ou em um validator aqui.
    # Por simplicidade, vamos exigir no endpoint.
    store_id: Optional[int] = None


class UserUpdate(UserBase):
    password: Optional[str] = Field(None, min_length=8)


class User(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True