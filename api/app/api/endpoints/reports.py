# api/app/api/endpoints/reports.py
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, datetime # Adicionar datetime
from typing import List, Any
from fastapi.responses import StreamingResponse
import io
import traceback # Para log detalhado
from loguru import logger # Para log detalhado

# Importar serviços e schemas
from app.services.analytics_service import analytics_service
from app.services.pdf_service import generate_enhanced_sales_report_pdf # Renomeado
from app.schemas.report import (
    SalesByPeriod, TopSellingProduct, SalesByUser, SalesEvolutionItem, PurchaseSuggestion,
    SalesByPaymentMethodItem, SalesByHourItem, SalesByCategoryItem, LowStockProductItem,
    TopCustomerItem, InactiveCustomerItem
)
from app.schemas import dashboard as dashboard_schemas
from app.api.dependencies import get_db, RoleChecker, get_current_active_user, get_current_user
from app.models.user import User as UserModel
from app.models.store import Store as StoreModel # Importar o modelo da Loja
from app.schemas.enums import UserRole
from app.services.dashboard_service import dashboard_service
from app.crud import crud_report # Importar o módulo crud_report
from app.schemas.user import User as UserSchema

router = APIRouter()

manager_permissions = RoleChecker([UserRole.ADMIN, UserRole.MANAGER])

# --- Rota PDF /pdf/sales-by-period (Atualizada com try/except robusto) ---
@router.get("/pdf/sales-by-period",
            response_class=StreamingResponse,
            dependencies=[Depends(manager_permissions)],
            summary="Gerar Relatório PDF Aprimorado de Vendas por Período")
async def generate_enhanced_sales_by_period_report_pdf( # Nome da função atualizado
    start_date: date,
    end_date: date,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    """
    Gera um relatório PDF aprimorado das vendas por período, incluindo detalhes adicionais.
    """
    if not current_user.store_id:
        raise HTTPException(status_code=400, detail="Usuário não associado a uma loja.")
    store = await db.get(StoreModel, current_user.store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Loja não encontrada.")

    # Busca todos os dados necessários usando as funções do crud_report (assíncronas)
    try:
        summary_data = await crud_report.get_sales_by_period(db, start_date=start_date, end_date=end_date)
        sales_by_user = await crud_report.get_sales_by_user(db, start_date=start_date, end_date=end_date)
        sales_by_payment = await crud_report.get_sales_by_payment_method(db, start_date=start_date, end_date=end_date)
        sales_by_category = await crud_report.get_sales_by_category(db, start_date=start_date, end_date=end_date)
        # Buscar top 5 produtos por receita no período
        top_products = await crud_report.get_top_selling_products_by_period(db, start_date=start_date, end_date=end_date, limit=5, order_by='revenue')

    except Exception as e:
        logger.error(f"Erro ao buscar dados para o relatório PDF (Vendas por Período): {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar dados para o relatório: {e}")

    # Geração do PDF com tratamento de erro específico
    try:
        buffer = io.BytesIO()
        generate_enhanced_sales_report_pdf( # Chama a função atualizada
            buffer=buffer,
            store=store,
            start_date=start_date,
            end_date=end_date,
            summary_data=summary_data,
            sales_by_user=sales_by_user,
            sales_by_payment=sales_by_payment,
            sales_by_category=sales_by_category,
            top_products=top_products
        )
        buffer.seek(0)
        filename = f"relatorio_vendas_{start_date}_a_{end_date}.pdf"

        # Retorna o StreamingResponse apenas se a geração foi bem-sucedida
        return StreamingResponse(
            buffer,
            media_type='application/pdf',
            headers={'Content-Disposition': f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        # Captura erros específicos da geração do PDF
        logger.error(f"Erro durante a geração do PDF (Vendas por Período) com reportlab: {e}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Falha ao gerar o arquivo PDF: {e}"
        )


# --- Rotas JSON existentes (sem alterações) ---
@router.get(
    "/purchase-suggestions",
    response_model=List[PurchaseSuggestion],
    dependencies=[Depends(manager_permissions)],
    summary="Obter Sugestões de Compra de Estoque"
)
async def get_purchase_suggestions(
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    # Nota: analytics_service.get_purchase_suggestions usa Session síncrona.
    # A chamada db.run_sync é necessária para executá-la corretamente em um endpoint async.
    try:
      suggestions = await db.run_sync(analytics_service.get_purchase_suggestions)
    except Exception as e:
       logger.error(f"Erro ao buscar sugestões de compra: {e}\n{traceback.format_exc()}")
       raise HTTPException(status_code=500, detail=f"Erro ao buscar sugestões: {e}")
    return suggestions

@router.get("/sales-by-period", response_model=SalesByPeriod)
async def report_sales_by_period(
    start_date: date,
    end_date: date,
    db: AsyncSession = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user) # Pode manter UserSchema aqui se preferir
):
    return await crud_report.get_sales_by_period(db, start_date=start_date, end_date=end_date)

@router.get("/top-selling-products", response_model=List[TopSellingProduct])
async def report_top_selling_products(
    limit: int = Query(5, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user) # Pode manter UserSchema aqui se preferir
):
    # Esta rota busca os top produtos GERAIS, não por período
    return await crud_report.get_top_selling_products(db, limit=limit)

@router.get("/sales-by-user", response_model=List[SalesByUser])
async def report_sales_by_user(
    start_date: date,
    end_date: date,
    db: AsyncSession = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user) # Pode manter UserSchema aqui se preferir
):
    return await crud_report.get_sales_by_user(db, start_date=start_date, end_date=end_date)

@router.get("/sales-evolution", response_model=List[SalesEvolutionItem])
async def report_sales_evolution(
    start_date: date,
    end_date: date,
    db: AsyncSession = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user) # Pode manter UserSchema aqui se preferir
):
    return await crud_report.get_sales_evolution_by_period(db, start_date=start_date, end_date=end_date)

@router.get(
    "/dashboard",
    response_model=dashboard_schemas.DashboardSummary,
    dependencies=[Depends(manager_permissions)],
    summary="Obter Dados Consolidados para o Dashboard"
)
async def get_dashboard_summary(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
) -> Any:
    if not current_user.store_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Utilizador não está associado a uma loja."
        )
    summary_data = await dashboard_service.get_dashboard_summary(db, store_id=current_user.store_id)
    return summary_data

# --- Adicionar rotas para os outros dados JSON se necessário ---
@router.get("/sales-by-payment-method", response_model=List[SalesByPaymentMethodItem])
async def report_sales_by_payment_method(
    start_date: date,
    end_date: date,
    db: AsyncSession = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user) # Pode manter UserSchema
):
    return await crud_report.get_sales_by_payment_method(db, start_date=start_date, end_date=end_date)

@router.get("/sales-by-hour", response_model=List[SalesByHourItem])
async def report_sales_by_hour(
    start_date: date,
    end_date: date,
    db: AsyncSession = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user) # Pode manter UserSchema
):
    return await crud_report.get_sales_by_hour(db, start_date=start_date, end_date=end_date)

@router.get("/sales-by-category", response_model=List[SalesByCategoryItem])
async def report_sales_by_category(
    start_date: date,
    end_date: date,
    db: AsyncSession = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user) # Pode manter UserSchema
):
    return await crud_report.get_sales_by_category(db, start_date=start_date, end_date=end_date)