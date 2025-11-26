from fastapi import APIRouter
from app.api.endpoints import (
    super_admin, stores, attributes, categories, batches, products,
    login, users, sales, cash_register, reports, additionals,
    customers, suppliers, ingredients, tables, orders, marketing, reservations, walls
)

api_router = APIRouter()

api_router.include_router(login.router, prefix="/login", tags=["login"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(stores.router, prefix="/stores", tags=["stores"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(customers.router, prefix="/customers", tags=["customers"])
api_router.include_router(suppliers.router, prefix="/suppliers", tags=["suppliers"])
api_router.include_router(sales.router, prefix="/sales", tags=["sales"])
api_router.include_router(reservations.router, prefix="/reservations", tags=["reservations"]) # <-- Adicione a nova rota
# --- CORREÇÃO APLICADA AQUI ---
# O prefixo foi alterado para o plural para corresponder à chamada do frontend.
api_router.include_router(cash_register.router, prefix="/cash-registers", tags=["cash-register"])
# -----------------------------
api_router.include_router(walls.router, prefix="/walls", tags=["walls"]) # <--- ADICIONE ESTA LINHA
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(additionals.router, prefix="/additionals", tags=["additionals"])
api_router.include_router(ingredients.router, prefix="/ingredients", tags=["ingredients"])
api_router.include_router(tables.router, prefix="/tables", tags=["tables"])
api_router.include_router(orders.router, prefix="/orders", tags=["orders"])
api_router.include_router(marketing.router, prefix="/marketing", tags=["marketing"])
api_router.include_router(batches.router, prefix="/batches", tags=["batches"])
api_router.include_router(attributes.router, prefix="/attributes", tags=["attributes"])
api_router.include_router(super_admin.router, prefix="/super-admin", tags=["super-admin"])