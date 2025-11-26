# api/app/crud/__init__.py

# Este arquivo torna mais fácil importar os objetos e módulos CRUD de outros locais.
# Exemplo: from app import crud -> crud.user.get(...)

# 1. Importa as instâncias de classes CRUDBase (onde um objeto 'user', 'product' etc. é exportado)
from .crud_user import user
from .crud_product import product
from .crud_customer import customer
from .crud_cash_register import cash_register
from .crud_store import store
from .crud_order import order
from .crud_supplier import supplier
from .crud_table import table
from .crud_batch import batch
from .crud_sale import sale
from .crud_reservation import reservation # <-- LINHA ADICIONADA AQUI
from .crud_wall import wall # <--- ADICIONE ESTA LINHA
# 2. Importa os módulos CRUD que são baseados em funções, usando um alias (apelido) para facilitar o acesso.
from . import crud_additional as additional
from . import crud_attribute as attribute
from . import crud_category as category
from . import crud_ingredient as ingredient
from . import crud_recipe as recipe
from . import crud_report as report
from . import crud_variation as variation