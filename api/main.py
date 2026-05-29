import os
import time

# Força o fuso horário da aplicação para o horário de Brasília
os.environ['TZ'] = 'America/Sao_Paulo'
if hasattr(time, 'tzset'):
    time.tzset()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

# --- INÍCIO DA CORREÇÃO ---
# Importa a Base e todos os modelos para garantir que o SQLAlchemy
# os conheça quando a aplicação iniciar.
from app.db.base import Base
from app.models import payment, user, product, customer, supplier, sale, cash_register, ingredient, recipe, additional, batch, table, order

# Importa as novas configurações
from app.core.logging_config import setup_logging
from app.core.exception_handler import global_exception_handler
# --- FIM DA CORREÇÃO ---

from app.api.api import api_router

# --- INÍCIO DA CORREÇÃO ---
# Configura o logging antes de criar a instância do app
setup_logging()
# --- FIM DA CORREÇÃO ---

# Cria a instância principal da aplicação FastAPI
app = FastAPI(
    title="Sistema de Gestão de Vendas",
    description="API para o sistema de gestão de vendas.",
    version="1.0.0"
)

# --- INÍCIO DA CORREÇÃO ---
# Adiciona o handler de exceção global
app.add_exception_handler(Exception, global_exception_handler)

# Adiciona um middleware para logar todas as requisições
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Aguarda a resposta da rota
    response = await call_next(request)
    
    process_time = (time.time() - start_time) * 1000
    formatted_process_time = f"{process_time:.2f}ms"

    # Loga os detalhes da requisição e da resposta
    logger.info(
        f"Request: {request.method} {request.url.path} | "
        f"Status: {response.status_code} | "
        f"Duration: {formatted_process_time}"
    )
    
    return response
# --- FIM DA CORREÇÃO ---

# Configuração do CORS
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclui o roteador principal da API, prefixado com /api/v1
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def read_root():
    """
    Endpoint raiz para verificar se a API está funcionando.
    """
    return {"message": "Bem-vindo à API de Gestão de Vendas!"}