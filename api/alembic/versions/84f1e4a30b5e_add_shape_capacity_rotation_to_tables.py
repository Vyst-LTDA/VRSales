"""add_shape_capacity_rotation_to_tables

Revision ID: 84f1e4a30b5e
Revises:
Create Date: 2025-10-21 09:06:08.981960

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '84f1e4a30b5e'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# --- Nomes dos ENUMs ---
UNITOFMEASURE_TYPE_NAME = 'unitofmeasure'
USERROLE_TYPE_NAME = 'userrole'
CASHREGISTERSTATUS_TYPE_NAME = 'cashregisterstatus'
ORDERSTATUS_TYPE_NAME = 'orderstatus'
ORDERTYPE_TYPE_NAME = 'ordertype'
TRANSACTIONTYPE_TYPE_NAME = 'transactiontype'
ORDERITEMSTATUS_TYPE_NAME = 'orderitemstatus'
MOVEMENTTYPE_TYPE_NAME = 'movementtype'
TABLESTATUS_TYPE_NAME = 'tablestatus'
TABLESHAPE_TYPE_NAME = 'tableshape' # Adicionado

# Definições SQLAlchemy (apenas para referência nas colunas, sem create_type)
UNITOFMEASURE_ENUM = sa.Enum('kg', 'g', 'l', 'ml', 'un', name=UNITOFMEASURE_TYPE_NAME, create_type=False)
USERROLE_ENUM = sa.Enum('super_admin', 'admin', 'manager', 'cashier', name=USERROLE_TYPE_NAME, create_type=False)
CASHREGISTERSTATUS_ENUM = sa.Enum('OPEN', 'CLOSED', name=CASHREGISTERSTATUS_TYPE_NAME, create_type=False) # Mantido maiúsculo se for assim no Python Enum
ORDERSTATUS_ENUM = sa.Enum('open', 'closed', 'paid', 'cancelled', name=ORDERSTATUS_TYPE_NAME, create_type=False)
ORDERTYPE_ENUM = sa.Enum('DINE_IN', 'DELIVERY', 'TAKEOUT', name=ORDERTYPE_TYPE_NAME, create_type=False) # Mantido maiúsculo
TRANSACTIONTYPE_ENUM = sa.Enum('OPENING_BALANCE', 'SALE_PAYMENT', 'SUPPLY', 'WITHDRAWAL', 'CLOSING_BALANCE', name=TRANSACTIONTYPE_TYPE_NAME, create_type=False) # Mantido maiúsculo
ORDERITEMSTATUS_ENUM = sa.Enum('pending', 'preparing', 'ready', 'delivered', name=ORDERITEMSTATUS_TYPE_NAME, create_type=False)
MOVEMENTTYPE_ENUM = sa.Enum('SALE', 'PURCHASE', 'ADJUSTMENT', 'RETURN', name=MOVEMENTTYPE_TYPE_NAME, create_type=False) # Mantido maiúsculo
TABLESTATUS_ENUM = sa.Enum('available', 'occupied', 'reserved', name=TABLESTATUS_TYPE_NAME, create_type=False)
TABLESHAPE_ENUM = sa.Enum('rectangle', 'round', name=TABLESHAPE_TYPE_NAME, create_type=False) # Adicionado
# --- Fim das Definições ---


# --- Função auxiliar para criar ENUMs de forma segura ---
def create_enum_type(enum_name, enum_values):
    op.execute(f"""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '{enum_name}') THEN
                CREATE TYPE {enum_name} AS ENUM ({', '.join(f"'{val}'" for val in enum_values)});
            END IF;
        END$$;
    """)
# --- Fim da função auxiliar ---

def upgrade() -> None:
    """Upgrade schema."""
    # --- Cria os tipos ENUM usando a função auxiliar ---
    create_enum_type(UNITOFMEASURE_TYPE_NAME, ['kg', 'g', 'l', 'ml', 'un'])
    create_enum_type(USERROLE_TYPE_NAME, ['super_admin', 'admin', 'manager', 'cashier'])
    create_enum_type(CASHREGISTERSTATUS_TYPE_NAME, ['OPEN', 'CLOSED'])
    create_enum_type(ORDERSTATUS_TYPE_NAME, ['open', 'closed', 'paid', 'cancelled'])
    create_enum_type(ORDERTYPE_TYPE_NAME, ['DINE_IN', 'DELIVERY', 'TAKEOUT'])
    create_enum_type(TRANSACTIONTYPE_TYPE_NAME, ['OPENING_BALANCE', 'SALE_PAYMENT', 'SUPPLY', 'WITHDRAWAL', 'CLOSING_BALANCE'])
    create_enum_type(ORDERITEMSTATUS_TYPE_NAME, ['pending', 'preparing', 'ready', 'delivered'])
    create_enum_type(MOVEMENTTYPE_TYPE_NAME, ['SALE', 'PURCHASE', 'ADJUSTMENT', 'RETURN'])
    create_enum_type(TABLESTATUS_TYPE_NAME, ['available', 'occupied', 'reserved'])
    create_enum_type(TABLESHAPE_TYPE_NAME, ['rectangle', 'round']) # Adicionado
    # --- Fim da criação dos ENUMs ---

    # --- Cria as tabelas (Usando as definições ENUM corrigidas) ---
    op.create_table('stores',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('address', sa.String(length=255), nullable=True),
        # Corrigido: remover server_default se o default do modelo cuida disso
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_stores_id'), 'stores', ['id'], unique=False)

    op.create_table('additionals',
        sa.Column('store_id', sa.Integer(), nullable=False),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('price', sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name', 'store_id', name='uq_additional_name_store') # Adicionado nome da constraint se necessário
    )
    op.create_index(op.f('ix_additionals_id'), 'additionals', ['id'], unique=False)

    op.create_table('attributes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('store_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name', 'store_id', name='uq_attribute_name_store') # Adicionado nome da constraint
    )

    op.create_table('customers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('full_name', sa.String(length=150), nullable=False),
        sa.Column('phone_number', sa.String(length=20), nullable=True),
        sa.Column('email', sa.String(length=100), nullable=True),
        sa.Column('document_number', sa.String(length=18), nullable=True),
        sa.Column('store_id', sa.Integer(), nullable=False),
        sa.Column('last_seen', sa.DateTime(), nullable=True),
        sa.Column('total_spent', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('loyalty_points', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id'], ),
        sa.PrimaryKeyConstraint('id'),
        # Ajuste nas constraints UNIQUE para incluir store_id se forem únicas por loja
        sa.UniqueConstraint('document_number', 'store_id', name='uq_customer_document_store'),
        sa.UniqueConstraint('phone_number', 'store_id', name='uq_customer_phone_store')
    )
    op.create_index(op.f('ix_customers_email'), 'customers', ['email'], unique=True) # Assumindo email único globalmente ou por loja
    op.create_index(op.f('ix_customers_id'), 'customers', ['id'], unique=False)

    op.create_table('ingredients',
        sa.Column('store_id', sa.Integer(), nullable=False),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('stock', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('unit_of_measure', UNITOFMEASURE_ENUM, nullable=False), # USA O ENUM CORRIGIDO
        sa.ForeignKeyConstraint(['store_id'], ['stores.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name', 'store_id', name='uq_ingredient_name_store') # Adicionado nome da constraint
    )
    op.create_index(op.f('ix_ingredients_id'), 'ingredients', ['id'], unique=False)
    # op.create_index(op.f('ix_ingredients_name'), 'ingredients', ['name'], unique=True) # UNIQUE constraint já faz isso

    op.create_table('product_categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('store_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name', 'store_id', name='uq_category_name_store') # Adicionado nome da constraint
    )
    op.create_index(op.f('ix_product_categories_id'), 'product_categories', ['id'], unique=False)

    op.create_table('suppliers',
        sa.Column('store_id', sa.Integer(), nullable=False),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('contact_person', sa.String(length=100), nullable=True),
        sa.Column('email', sa.String(length=100), nullable=True),
        sa.Column('phone_number', sa.String(length=20), nullable=True),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_suppliers_email'), 'suppliers', ['email'], unique=True) # Assumindo email único por loja ou globalmente
    op.create_index(op.f('ix_suppliers_id'), 'suppliers', ['id'], unique=False)
    op.create_index(op.f('ix_suppliers_name'), 'suppliers', ['name'], unique=False) # Nome de fornecedor pode repetir entre lojas

    op.create_table('tables',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('number', sa.String(length=50), nullable=False),
        sa.Column('status', TABLESTATUS_ENUM, nullable=False, server_default='available'), # Usa o ENUM
        sa.Column('store_id', sa.Integer(), nullable=False),
        sa.Column('pos_x', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('pos_y', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('capacity', sa.Integer(), server_default='4', nullable=False),
        sa.Column('shape', TABLESHAPE_ENUM, nullable=False, server_default='rectangle'), # Usa o ENUM
        sa.Column('rotation', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('number', 'store_id', name='uq_table_number_store') # Adicionado nome da constraint
    )
    op.create_index(op.f('ix_tables_id'), 'tables', ['id'], unique=False)

    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('full_name', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=100), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('role', USERROLE_ENUM, nullable=False, server_default='cashier'), # Usa o ENUM
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('store_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)

    op.create_table('attribute_options',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('value', sa.String(length=50), nullable=False),
        sa.Column('attribute_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['attribute_id'], ['attributes.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('value', 'attribute_id', name='uq_option_value_attribute') # Adicionado nome
    )

    op.create_table('cash_registers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('store_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('status', CASHREGISTERSTATUS_ENUM, nullable=False, server_default='OPEN'), # Usa o ENUM
        sa.Column('opening_balance', sa.Float(), nullable=False),
        sa.Column('closing_balance', sa.Float(), nullable=True),
        sa.Column('expected_balance', sa.Float(), nullable=True),
        sa.Column('balance_difference', sa.Float(), nullable=True),
        sa.Column('opened_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('closed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_cash_registers_id'), 'cash_registers', ['id'], unique=False)

    op.create_table('orders',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('store_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('status', ORDERSTATUS_ENUM, nullable=False, server_default='open'), # Usa o ENUM
        sa.Column('order_type', ORDERTYPE_ENUM, nullable=False), # Usa o ENUM
        sa.Column('delivery_address', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('closed_at', sa.DateTime(), nullable=True),
        sa.Column('table_id', sa.Integer(), nullable=True),
        sa.Column('customer_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id'], ),
        sa.ForeignKeyConstraint(['table_id'], ['tables.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_orders_id'), 'orders', ['id'], unique=False)

    op.create_table('product_subcategories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('parent_category_id', sa.Integer(), nullable=False),
        sa.Column('store_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['parent_category_id'], ['product_categories.id'], ),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name', 'parent_category_id', name='uq_subcategory_name_parent') # Adicionado nome
    )
    op.create_index(op.f('ix_product_subcategories_id'), 'product_subcategories', ['id'], unique=False)

    op.create_table('reservations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('customer_name', sa.String(length=150), nullable=False),
        sa.Column('phone_number', sa.String(length=20), nullable=True),
        sa.Column('reservation_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('number_of_people', sa.Integer(), nullable=False),
        sa.Column('notes', sa.String(length=500), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='confirmed'),
        sa.Column('table_id', sa.Integer(), nullable=False),
        sa.Column('store_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id'], ),
        sa.ForeignKeyConstraint(['table_id'], ['tables.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_reservations_id'), 'reservations', ['id'], unique=False)
    op.create_index(op.f('ix_reservations_reservation_time'), 'reservations', ['reservation_time'], unique=False)

    op.create_table('products',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('price', sa.Float(), nullable=False),
        sa.Column('stock', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('low_stock_threshold', sa.Integer(), server_default='10', nullable=False),
        sa.Column('image_url', sa.String(length=500), nullable=True),
        sa.Column('barcode', sa.String(length=100), nullable=True),
        sa.Column('category_id', sa.Integer(), nullable=True),
        sa.Column('subcategory_id', sa.Integer(), nullable=True),
        sa.Column('store_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['category_id'], ['product_categories.id'], ),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id'], ),
        sa.ForeignKeyConstraint(['subcategory_id'], ['product_subcategories.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_products_barcode'), 'products', ['barcode'], unique=True)
    op.create_index(op.f('ix_products_id'), 'products', ['id'], unique=False)
    op.create_index(op.f('ix_products_name'), 'products', ['name'], unique=False)

    op.create_table('sales',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('total_amount', sa.Float(), nullable=False),
        sa.Column('payment_method', sa.String(length=50), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('customer_id', sa.Integer(), nullable=True),
        sa.Column('cash_register_id', sa.Integer(), nullable=True),
        sa.Column('store_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['cash_register_id'], ['cash_registers.id'], ),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sales_id'), 'sales', ['id'], unique=False)

    op.create_table('cash_register_transactions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('cash_register_id', sa.Integer(), nullable=False),
        sa.Column('sale_id', sa.Integer(), nullable=True),
        sa.Column('transaction_type', TRANSACTIONTYPE_ENUM, nullable=False), # Usa o ENUM
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['cash_register_id'], ['cash_registers.id'], ),
        sa.ForeignKeyConstraint(['sale_id'], ['sales.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('order_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('paid_quantity', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('price_at_order', sa.Float(), nullable=False),
        sa.Column('notes', sa.String(length=255), nullable=True),
        sa.Column('status', ORDERITEMSTATUS_ENUM, nullable=False, server_default='pending'), # Usa o ENUM
        sa.Column('order_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('payments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('order_id', sa.Integer(), nullable=True),
        sa.Column('sale_id', sa.Integer(), nullable=True),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('payment_method', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='completed'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ),
        sa.ForeignKeyConstraint(['sale_id'], ['sales.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_payments_id'), 'payments', ['id'], unique=False)

    op.create_table('product_batches',
        sa.Column('store_id', sa.Integer(), nullable=False),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Float(), nullable=False),
        sa.Column('expiration_date', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_product_batches_expiration_date'), 'product_batches', ['expiration_date'], unique=False)
    op.create_index(op.f('ix_product_batches_id'), 'product_batches', ['id'], unique=False)

    op.create_table('product_variations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('price', sa.Float(), nullable=False),
        sa.Column('stock', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('barcode', sa.String(length=100), nullable=True),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('barcode')
    )

    op.create_table('recipe_items',
        sa.Column('store_id', sa.Integer(), nullable=False),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('quantity_needed', sa.Float(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('ingredient_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['ingredient_id'], ['ingredients.id'], ),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('sale_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('price_at_sale', sa.Float(), nullable=False),
        sa.Column('sale_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.ForeignKeyConstraint(['sale_id'], ['sales.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('stock_movements',
        sa.Column('store_id', sa.Integer(), nullable=False),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('movement_type', MOVEMENTTYPE_ENUM, nullable=False), # Usa o ENUM
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('stock_after_movement', sa.Integer(), nullable=False),
        sa.Column('reason', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_stock_movements_id'), 'stock_movements', ['id'], unique=False)

    op.create_table('order_item_additionals',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('order_item_id', sa.Integer(), nullable=False),
        sa.Column('additional_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['additional_id'], ['additionals.id'], ),
        sa.ForeignKeyConstraint(['order_item_id'], ['order_items.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('variation_options_association',
        sa.Column('variation_id', sa.Integer(), nullable=False),
        sa.Column('option_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['option_id'], ['attribute_options.id'], ),
        sa.ForeignKeyConstraint(['variation_id'], ['product_variations.id'], ),
        sa.PrimaryKeyConstraint('variation_id', 'option_id')
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('variation_options_association')
    op.drop_table('order_item_additionals')
    op.drop_index(op.f('ix_stock_movements_id'), table_name='stock_movements')
    op.drop_table('stock_movements')
    op.drop_table('sale_items')
    op.drop_table('recipe_items')
    op.drop_table('product_variations')
    op.drop_index(op.f('ix_product_batches_id'), table_name='product_batches')
    op.drop_index(op.f('ix_product_batches_expiration_date'), table_name='product_batches')
    op.drop_table('product_batches')
    op.drop_index(op.f('ix_payments_id'), table_name='payments')
    op.drop_table('payments')
    op.drop_table('order_items')
    op.drop_table('cash_register_transactions')
    op.drop_index(op.f('ix_sales_id'), table_name='sales')
    op.drop_table('sales')
    op.drop_index(op.f('ix_products_name'), table_name='products')
    op.drop_index(op.f('ix_products_id'), table_name='products')
    op.drop_index(op.f('ix_products_barcode'), table_name='products')
    op.drop_table('products')
    op.drop_index(op.f('ix_reservations_reservation_time'), table_name='reservations')
    op.drop_index(op.f('ix_reservations_id'), table_name='reservations')
    op.drop_table('reservations')
    op.drop_index(op.f('ix_product_subcategories_id'), table_name='product_subcategories')
    op.drop_table('product_subcategories')
    op.drop_index(op.f('ix_orders_id'), table_name='orders')
    op.drop_table('orders')
    op.drop_index(op.f('ix_cash_registers_id'), table_name='cash_registers')
    op.drop_table('cash_registers')
    op.drop_table('attribute_options')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
    op.drop_index(op.f('ix_tables_id'), table_name='tables')
    op.drop_table('tables')
    op.drop_index(op.f('ix_suppliers_name'), table_name='suppliers')
    op.drop_index(op.f('ix_suppliers_id'), table_name='suppliers')
    op.drop_index(op.f('ix_suppliers_email'), table_name='suppliers')
    op.drop_table('suppliers')
    op.drop_index(op.f('ix_product_categories_id'), table_name='product_categories')
    op.drop_table('product_categories')
    # op.drop_index(op.f('ix_ingredients_name'), table_name='ingredients') # Comentado pois UNIQUE faz isso
    op.drop_index(op.f('ix_ingredients_id'), table_name='ingredients')
    op.drop_table('ingredients')
    op.drop_index(op.f('ix_customers_id'), table_name='customers')
    op.drop_index(op.f('ix_customers_email'), table_name='customers')
    op.drop_table('customers')
    op.drop_table('attributes')
    op.drop_index(op.f('ix_additionals_id'), table_name='additionals')
    op.drop_table('additionals')
    op.drop_index(op.f('ix_stores_id'), table_name='stores')
    op.drop_table('stores')

    # --- Remove os tipos ENUM com SQL puro ---
    op.execute(f"DROP TYPE IF EXISTS {TABLESHAPE_TYPE_NAME}") # Adicionado
    op.execute(f"DROP TYPE IF EXISTS {TABLESTATUS_TYPE_NAME}")
    op.execute(f"DROP TYPE IF EXISTS {MOVEMENTTYPE_TYPE_NAME}")
    op.execute(f"DROP TYPE IF EXISTS {ORDERITEMSTATUS_TYPE_NAME}")
    op.execute(f"DROP TYPE IF EXISTS {TRANSACTIONTYPE_TYPE_NAME}")
    op.execute(f"DROP TYPE IF EXISTS {ORDERTYPE_TYPE_NAME}")
    op.execute(f"DROP TYPE IF EXISTS {ORDERSTATUS_TYPE_NAME}")
    op.execute(f"DROP TYPE IF EXISTS {CASHREGISTERSTATUS_TYPE_NAME}")
    op.execute(f"DROP TYPE IF EXISTS {USERROLE_TYPE_NAME}")
    op.execute(f"DROP TYPE IF EXISTS {UNITOFMEASURE_TYPE_NAME}")
    # --- Fim da remoção dos ENUMs ---
    # ### end Alembic commands ###