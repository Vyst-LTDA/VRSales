from datetime import datetime, timedelta, timezone
from typing import Any, Dict # Importar Dict
from passlib.context import CryptContext
from jose import jwt
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"
# A variável ACCESS_TOKEN_EXPIRE_MINUTES ainda existe nas configurações,
# mas não será usada na criação do token abaixo.
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: Dict[str, Any], expires_delta: timedelta | None = None):
    to_encode = data.copy()
    # --- REMOÇÃO DA EXPIRAÇÃO ---
    # As linhas abaixo que definiam e adicionavam o campo 'exp' foram comentadas/removidas.
    # if expires_delta:
    #     expire = datetime.now(timezone.utc) + expires_delta
    # else:
    #     # Define um tempo de expiração padrão muito longo (ex: 10 anos) ou remove completamente
    #     # expire = datetime.now(timezone.utc) + timedelta(days=365*10) # Exemplo: 10 anos
    #     pass # Ou simplesmente não define 'exp'
    # to_encode.update({"exp": expire}) # Linha removida/comentada
    # --- FIM DA REMOÇÃO ---
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict | None:
    try:
        # Ao decodificar, não precisamos mais verificar a expiração aqui,
        # a biblioteca 'jose' pode fazer isso se 'exp' estiver presente,
        # mas como removemos, ele não será verificado.
        # Opções como 'options={"verify_exp": False}' poderiam ser usadas se
        # quiséssemos explicitamente ignorar a expiração caso ela existisse.
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.JWTError:
        return None