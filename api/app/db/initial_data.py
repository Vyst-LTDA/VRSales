# api/app/db/initial_data.py
import asyncio
import logging

# Configuração básica de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 1. Importar a Base e a engine assíncrona
from app.db.base import Base
from app.db.session import async_engine

# 2. Importar TODOS os seus modelos para que Base.metadata os conheça
#    Certifique-se de que esta lista está completa!
from app.models.store import Store
from app.models.user import User
from app.models.product import ProductCategory, ProductSubcategory # Corrigido se for este o nome
from app.models.product import Product
from app.models.customer import Customer
from app.models.supplier import Supplier
from app.models.ingredient import Ingredient
from app.models.recipe import RecipeItem
from app.models.additional import Additional, OrderItemAdditional
from app.models.batch import ProductBatch
from app.models.table import Table
from app.models.order import Order, OrderItem
from app.models.payment import Payment
from app.models.sale import Sale, SaleItem
from app.models.cash_register import CashRegister, CashRegisterTransaction
from app.models.stock_movement import StockMovement
from app.models.variation import Attribute, AttributeOption, ProductVariation, VariationOptionsAssociation
from app.models.reservation import Reservation
from app.models.wall import Wall
# Adicione qualquer outro modelo que você tenha

async def init_db() -> None:
    logger.info("Iniciando a recriação do banco de dados...")
    async with async_engine.begin() as conn:
        logger.info("Removendo todas as tabelas e tipos ENUM existentes (se houver)...")
        # drop_all removerá tabelas E os tipos ENUM associados se criados pelo SQLAlchemy
        await conn.run_sync(Base.metadata.drop_all)
        logger.info("Tabelas e tipos removidos.")

        logger.info("Criando todas as tabelas e tipos ENUM...")
        # create_all criará tabelas E os tipos ENUM porque ajustamos create_type=True nos modelos
        await conn.run_sync(Base.metadata.create_all)
        logger.info("Tabelas e tipos ENUM criados com sucesso.")

    # Opcional: Adicionar dados iniciais aqui se necessário
    # Exemplo: Criar um usuário super_admin inicial
    # from sqlalchemy.ext.asyncio import AsyncSession
    # from app.db.session import AsyncSessionLocal
    # from app.core.security import get_password_hash
    # from app.schemas.enums import UserRole
    #
    # logger.info("Criando usuário super_admin inicial...")
    # async with AsyncSessionLocal() as db:
    #     super_admin = User(
    #         full_name="Admin Principal",
    #         email="admin@example.com", # Troque este email!
    #         hashed_password=get_password_hash("admin123"), # Troque esta senha!
    #         role=UserRole.SUPER_ADMIN,
    #         is_active=True,
    #         store_id=None # Super admin não tem loja
    #     )
    #     db.add(super_admin)
    #     try:
    #         await db.commit()
    #         logger.info("Usuário super_admin criado.")
    #     except Exception as e:
    #         logger.error(f"Erro ao criar super_admin: {e}")
    #         await db.rollback()

    logger.info("Processo de inicialização do banco de dados concluído.")

async def main() -> None:
    await init_db()

if __name__ == "__main__":
    asyncio.run(main())