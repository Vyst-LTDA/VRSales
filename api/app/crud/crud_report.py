from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc, extract # Adicionado extract
from datetime import date, timedelta
from typing import List, Dict, Any # Adicionado Dict e Any

from app.models.sale import Sale, SaleItem
from app.models.product import Product
from app.models.user import User
from app.models.payment import Payment # Adicionado Payment
from app.models.category import ProductCategory # Adicionado ProductCategory

# Schemas são usados para tipagem de retorno, mas a lógica está aqui
from app.schemas.report import (
    SalesByPeriod, TopSellingProduct, SalesByUser, SalesEvolutionItem,
    SalesByPaymentMethodItem, SalesByHourItem, SalesByCategoryItem # Adicionados
)

async def get_top_selling_products_by_period(
    db: AsyncSession, start_date: date, end_date: date, limit: int = 5, order_by: str = 'revenue'
) -> List[TopSellingProduct]:
    """ Retorna os produtos mais vendidos (por receita ou quantidade) em um período específico. """
    stmt = (
        select(
            SaleItem.product_id,
            Product.name.label("product_name"),
            func.sum(SaleItem.quantity).label("total_quantity_sold"),
            func.sum(SaleItem.quantity * SaleItem.price_at_sale).label("total_revenue") # Usar total_revenue agora
        )
        .join(Product, SaleItem.product_id == Product.id)
        .join(Sale, SaleItem.sale_id == Sale.id) # *** JOIN com Sale para filtrar data ***
        .where(
            func.date(Sale.created_at) >= start_date, # *** Filtro de data ***
            func.date(Sale.created_at) <= end_date   # *** Filtro de data ***
        )
        .group_by(SaleItem.product_id, Product.name)
    )

    if order_by == 'revenue':
        stmt = stmt.order_by(desc("total_revenue")) # Ordena pela receita
    else: # order_by 'quantity'
        stmt = stmt.order_by(desc("total_quantity_sold"))

    stmt = stmt.limit(limit)

    result = await db.execute(stmt)
    # Convertendo para o schema Pydantic explicitamente
    # Ajuste: O schema espera 'total_revenue', não 'total_revenue_generated'
    return [TopSellingProduct(**row._mapping) for row in result]

async def get_sales_by_period(db: AsyncSession, start_date: date, end_date: date) -> SalesByPeriod:
    """
    Calcula o total de vendas, número de transações e ticket médio
    dentro de um período de datas.
    """
    stmt = select(
        func.coalesce(func.sum(Sale.total_amount), 0.0).label("total_sales"),
        func.coalesce(func.count(Sale.id), 0).label("num_transactions")
    ).where(
        func.date(Sale.created_at) >= start_date,
        func.date(Sale.created_at) <= end_date
    )
    result = await db.execute(stmt)
    data = result.one() # Usar one() pois esperamos sempre uma linha

    total_sales = float(data.total_sales)
    num_transactions = int(data.num_transactions)
    average_ticket = (total_sales / num_transactions) if num_transactions > 0 else 0.0

    return SalesByPeriod(
        total_sales_amount=total_sales,
        number_of_transactions=num_transactions,
        average_ticket=average_ticket
    )

async def get_top_selling_products(db: AsyncSession, limit: int = 5) -> List[TopSellingProduct]:
    """
    Retorna uma lista dos produtos mais vendidos por quantidade.
    """
    stmt = (
        select(
            SaleItem.product_id,
            Product.name.label("product_name"),
            func.sum(SaleItem.quantity).label("total_quantity_sold"), # Nome da coluna corrigido
            func.sum(SaleItem.quantity * SaleItem.price_at_sale).label("total_revenue")
        )
        .join(Product, SaleItem.product_id == Product.id)
        .group_by(SaleItem.product_id, Product.name)
        .order_by(desc("total_quantity_sold")) # Ordenar pelo nome corrigido
        .limit(limit)
    )
    result = await db.execute(stmt)
    # Convertendo para o schema Pydantic explicitamente
    return [TopSellingProduct(**row._mapping) for row in result]


async def get_sales_by_user(db: AsyncSession, start_date: date, end_date: date) -> List[SalesByUser]:
    """
    Agrupa o total de vendas e transações por usuário em um período.
    """
    stmt = (
        select(
            Sale.user_id,
            User.full_name.label("user_full_name"),
            func.coalesce(func.sum(Sale.total_amount), 0.0).label("total_sales_amount"),
            func.coalesce(func.count(Sale.id), 0).label("number_of_transactions")
        )
        .join(User, Sale.user_id == User.id)
        .where(
            func.date(Sale.created_at) >= start_date,
            func.date(Sale.created_at) <= end_date
        )
        .group_by(Sale.user_id, User.full_name)
        .order_by(desc("total_sales_amount"))
    )
    result = await db.execute(stmt)
    return [SalesByUser(**row._mapping) for row in result]


async def get_sales_evolution_by_period(db: AsyncSession, start_date: date, end_date: date) -> List[SalesEvolutionItem]:
    """
    Retorna o total de vendas agrupado por dia para um gráfico de evolução.
    """
    stmt = (
        select(
            func.date(Sale.created_at).label("sale_date"), # Alias diferente para evitar conflito
            func.coalesce(func.sum(Sale.total_amount), 0.0).label("value")
        ).where(
            func.date(Sale.created_at) >= start_date,
            func.date(Sale.created_at) <= end_date
        )
        .group_by(func.date(Sale.created_at))
        .order_by(func.date(Sale.created_at))
    )
    result = await db.execute(stmt)

    sales_data = {item.sale_date: float(item.value) for item in result.mappings().all()}
    all_dates_data = []
    current_date = start_date
    while current_date <= end_date:
        all_dates_data.append(SalesEvolutionItem(
            date=current_date.strftime("%d/%m"), # Formato dia/mês
            value=sales_data.get(current_date, 0.0)
        ))
        current_date += timedelta(days=1)

    return all_dates_data

# --- INÍCIO DAS NOVAS FUNÇÕES ---

async def get_sales_by_payment_method(db: AsyncSession, start_date: date, end_date: date) -> List[SalesByPaymentMethodItem]:
    """ Agrupa o total de vendas e transações por método de pagamento em um período. """
    stmt = (
        select(
            Payment.payment_method,
            func.coalesce(func.sum(Payment.amount), 0.0).label("total_amount"),
            func.coalesce(func.count(Payment.id), 0).label("transaction_count")
        )
        # Junta Payment com Sale para poder filtrar pela data da venda
        .join(Sale, Payment.sale_id == Sale.id)
        .where(
            func.date(Sale.created_at) >= start_date,
            func.date(Sale.created_at) <= end_date
        )
        .group_by(Payment.payment_method)
        .order_by(Payment.payment_method)
    )
    result = await db.execute(stmt)
    return [SalesByPaymentMethodItem(**row._mapping) for row in result]


async def get_sales_by_hour(db: AsyncSession, start_date: date, end_date: date) -> List[SalesByHourItem]:
    """ Agrupa o total de vendas e transações por hora do dia em um período. """
    stmt = (
        select(
            extract('hour', Sale.created_at).label('hour'),
            func.coalesce(func.sum(Sale.total_amount), 0.0).label('total_amount'),
            func.coalesce(func.count(Sale.id), 0).label('transaction_count')
        )
        .where(
            func.date(Sale.created_at) >= start_date,
            func.date(Sale.created_at) <= end_date
        )
        .group_by(extract('hour', Sale.created_at))
        .order_by(extract('hour', Sale.created_at))
    )
    result = await db.execute(stmt)
    sales_data = {item.hour: item for item in result.mappings().all()}

    # Preenche as horas sem vendas com zero
    hourly_sales: List[SalesByHourItem] = []
    for hour in range(24):
        if hour in sales_data:
            hourly_sales.append(SalesByHourItem(**sales_data[hour]))
        else:
            hourly_sales.append(SalesByHourItem(hour=hour, total_amount=0.0, transaction_count=0))

    return hourly_sales


async def get_sales_by_category(db: AsyncSession, start_date: date, end_date: date) -> List[SalesByCategoryItem]:
    """ Agrupa o total de vendas e transações por categoria de produto em um período. """
    stmt = (
        select(
            ProductCategory.name.label("category_name"),
            func.coalesce(func.sum(SaleItem.quantity * SaleItem.price_at_sale), 0.0).label("total_amount"),
            func.coalesce(func.count(func.distinct(Sale.id)), 0).label("transaction_count") # Conta vendas distintas
        )
        .select_from(SaleItem) # Começa a query a partir de SaleItem
        .join(Sale, SaleItem.sale_id == Sale.id)
        .join(Product, SaleItem.product_id == Product.id)
        .join(ProductCategory, Product.category_id == ProductCategory.id) # Junta com Categoria
        .where(
            func.date(Sale.created_at) >= start_date,
            func.date(Sale.created_at) <= end_date
        )
        .group_by(ProductCategory.name)
        .order_by(ProductCategory.name)
    )
    result = await db.execute(stmt)
    return [SalesByCategoryItem(**row._mapping) for row in result]

# --- FIM DAS NOVAS FUNÇÕES ---

# TODO: Implementar get_low_stock_products, get_top_customers, get_inactive_customers
# Essas funções podem depender de como você define "top" ou "inativo" e podem
# precisar de lógica adicional nos models ou schemas.