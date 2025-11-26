from pydantic import BaseModel
from datetime import date
from typing import List

class SalesByPeriod(BaseModel):
    """ Relatório de vendas totais em um período. """
    total_sales_amount: float
    number_of_transactions: int
    average_ticket: float

class TopSellingProduct(BaseModel):
    """ Relatório de um produto mais vendido. """
    product_id: int
    product_name: str
    total_quantity_sold: int
    total_revenue: float

class PurchaseSuggestion(BaseModel):
    """Schema para um item na lista de sugestões de compra."""
    product_id: int
    product_name: str
    current_stock: int
    low_stock_threshold: int
    sales_last_30_days: int
    suggested_purchase_quantity: int
    
class SalesByUser(BaseModel):
    """ Relatório de vendas consolidadas por usuário/vendedor. """
    user_id: int
    user_full_name: str
    total_sales_amount: float
    number_of_transactions: int

class SalesEvolutionItem(BaseModel):
    """ Representa um ponto de dados no gráfico de evolução de vendas. """
    date: str
    value: float

class SalesByPaymentMethodItem(BaseModel):
    """ Relatório de vendas por método de pagamento. """
    payment_method: str
    total_amount: float
    transaction_count: int

class SalesByHourItem(BaseModel):
    """ Relatório de vendas por hora. """
    hour: int
    total_amount: float
    transaction_count: int

class SalesByCategoryItem(BaseModel):
    """ Relatório de vendas por categoria de produto. """
    category_name: str
    total_amount: float
    transaction_count: int

class LowStockProductItem(BaseModel):
    """ Relatório de produtos com estoque baixo. """
    product_id: int
    product_name: str
    current_stock: int
    low_stock_threshold: int

class TopCustomerItem(BaseModel):
    """ Relatório de clientes com maior volume de compras. """
    customer_id: int
    customer_name: str
    total_spent: float

class InactiveCustomerItem(BaseModel):
    """ Relatório de clientes inativos. """
    customer_id: int
    customer_name: str
    last_seen: date
    