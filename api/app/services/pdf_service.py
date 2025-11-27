# api/app/services/pdf_service.py
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

from datetime import date, datetime
from typing import List, Any
import io

# Importar schemas e modelos
from app.schemas.report import SalesByPeriod, SalesByUser, SalesByPaymentMethodItem, SalesByCategoryItem, TopSellingProduct
from app.models.store import Store

# --- CORES (Minimalistas) ---
COLOR_PRIMARY = colors.HexColor('#0052CC')    # Azul Institucional
COLOR_TEXT_DARK = colors.HexColor('#172B4D')  # Texto Escuro
COLOR_TEXT_LIGHT = colors.HexColor('#6B778C') # Texto Cinza
COLOR_BG_LIGHT = colors.HexColor('#F4F5F7')   # Fundo Cinza Claro (apenas para detalhes sutis)

# --- Helpers ---
def format_currency(value: float) -> str:
    if value is None: return "R$ 0,00"
    try:
        return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    except (TypeError, ValueError): return str(value)

def translate_payment_method(method: str) -> str:
    mapping = {
        'credit_card': 'Cartão de Crédito',
        'debit_card': 'Cartão de Débito',
        'cash': 'Dinheiro',
        'pix': 'PIX',
        'other': 'Outros'
    }
    return mapping.get(method, method.replace('_', ' ').title())

# --- Componentes Visuais ---

def create_summary_cards(summary_data: SalesByPeriod) -> Table:
    """Cria uma linha com resumo textual limpo e direto."""
    
    style_label = ParagraphStyle('CardLabel', fontName='Helvetica', fontSize=9, textColor=COLOR_TEXT_LIGHT, alignment=TA_CENTER)
    style_value = ParagraphStyle('CardValue', fontName='Helvetica-Bold', fontSize=18, textColor=COLOR_TEXT_DARK, alignment=TA_CENTER)
    style_value_highlight = ParagraphStyle('CardValueHigh', fontName='Helvetica-Bold', fontSize=22, textColor=COLOR_PRIMARY, alignment=TA_CENTER)

    receita = [Paragraph("FATURAMENTO", style_label), Paragraph(format_currency(summary_data.total_sales_amount), style_value_highlight)]
    vendas = [Paragraph("VENDAS", style_label), Paragraph(str(summary_data.number_of_transactions), style_value)]
    ticket = [Paragraph("TICKET MÉDIO", style_label), Paragraph(format_currency(summary_data.average_ticket), style_value)]

    data = [[receita, vendas, ticket]]
    
    # Layout sem bordas pesadas, apenas espaçamento
    t = Table(data, colWidths=[8*cm, 5*cm, 5*cm])
    t.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    return t

def create_minimalist_table(data: List[List[Any]], col_widths: List[float], align_right_cols: List[int] = []) -> Table:
    """Tabela minimalista: sem cores de fundo fortes, apenas linhas divisórias sutis."""
    t = Table(data, colWidths=col_widths)
    
    style = [
        # Fonte Header
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('TEXTCOLOR', (0, 0), (-1, 0), COLOR_TEXT_DARK),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('LINEBELOW', (0, 0), (-1, 0), 1, colors.lightgrey), # Linha apenas abaixo do header
        
        # Fonte Corpo
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('LINEBELOW', (0, 1), (-1, -1), 0.5, COLOR_BG_LIGHT), # Linhas sutis entre itens
    ]

    # Alinhamento à direita para colunas de valor
    for col_idx in align_right_cols:
        style.append(('ALIGN', (col_idx, 0), (col_idx, -1), 'RIGHT'))

    t.setStyle(TableStyle(style))
    return t

# --- Função Principal ---
def generate_enhanced_sales_report_pdf(
    buffer: io.BytesIO,
    store: Store,
    start_date: date,
    end_date: date,
    summary_data: SalesByPeriod,
    sales_by_user: List[SalesByUser] = [],
    sales_by_payment: List[SalesByPaymentMethodItem] = [],
    sales_by_category: List[SalesByCategoryItem] = [],
    top_products: List[TopSellingProduct] = []
) -> None:
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            leftMargin=1.5*cm, rightMargin=1.5*cm,
                            topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    story = []
    width = doc.width

    # Estilos de Texto
    style_h1 = ParagraphStyle('H1', parent=styles['Heading1'], fontSize=16, textColor=COLOR_TEXT_DARK, spaceAfter=4, alignment=TA_LEFT)
    style_h2 = ParagraphStyle('H2', parent=styles['Normal'], fontSize=10, textColor=COLOR_TEXT_LIGHT, spaceAfter=20, alignment=TA_LEFT)
    # Títulos de seção discretos (uppercase, pequeno, cinza)
    style_section = ParagraphStyle('Section', parent=styles['Normal'], fontSize=9, textColor=COLOR_TEXT_LIGHT, spaceBefore=20, spaceAfter=5, textTransform='uppercase')

    # 1. Cabeçalho
    story.append(Paragraph("Relatório de Fechamento", style_h1))
    story.append(Paragraph(f"{store.name} • {start_date.strftime('%d/%m/%Y')} até {end_date.strftime('%d/%m/%Y')}", style_h2))
    
    # 2. Resumo (Cards)
    story.append(create_summary_cards(summary_data))
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph("_" * 90, style=ParagraphStyle('Div', textColor=COLOR_BG_LIGHT, alignment=TA_CENTER))) # Linha divisória sutil
    story.append(Spacer(1, 0.5*cm))

    # 3. Detalhamento Financeiro (Tabela Minimalista)
    if sales_by_payment:
        story.append(Paragraph("Formas de Pagamento", style_section))
        
        header = ["Método", "Qtd", "%", "Valor"]
        data = [header]
        total_sales = sum(p.total_amount for p in payment_data) if 'payment_data' in locals() else summary_data.total_sales_amount
        
        for p in sales_by_payment:
            percent = (p.total_amount / total_sales * 100) if total_sales > 0 else 0
            row = [
                translate_payment_method(p.payment_method),
                str(p.transaction_count),
                f"{percent:.1f}%",
                format_currency(p.total_amount)
            ]
            data.append(row)
            
        story.append(create_minimalist_table(data, [width*0.4, width*0.2, width*0.2, width*0.2], align_right_cols=[1, 2, 3]))

    # 4. Desempenho Equipe
    if sales_by_user:
        story.append(Paragraph("Vendas por Vendedor", style_section))
        user_data = [["Vendedor", "Vendas", "Total"]]
        user_data.extend([[u.user_full_name, str(u.number_of_transactions), format_currency(u.total_sales_amount)] for u in sales_by_user])
        story.append(create_minimalist_table(user_data, [width*0.5, width*0.2, width*0.3], align_right_cols=[1, 2]))

    # 5. Desempenho Categorias
    if sales_by_category:
        story.append(Paragraph("Vendas por Categoria", style_section))
        cat_data = [["Categoria", "Vendas", "Total"]]
        cat_data.extend([[c.category_name, str(c.transaction_count), format_currency(c.total_amount)] for c in sales_by_category])
        story.append(create_minimalist_table(cat_data, [width*0.5, width*0.2, width*0.3], align_right_cols=[1, 2]))

    # 6. Top Produtos
    if top_products:
        story.append(Paragraph("Produtos Mais Vendidos", style_section))
        prod_data = [["Produto", "Qtd", "Receita"]]
        prod_data.extend([[p.product_name, str(p.total_quantity_sold), format_currency(p.total_revenue)] for p in top_products])
        story.append(create_minimalist_table(prod_data, [width*0.6, width*0.1, width*0.3], align_right_cols=[1, 2]))

    # Footer
    def footer(canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.grey)
        canvas.drawString(doc.leftMargin, 1*cm, f"Gerado em {datetime.now().strftime('%d/%m/%Y %H:%M')}")
        canvas.drawRightString(doc.pagesize[0] - doc.rightMargin, 1*cm, f"Pág. {doc.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=footer, onLaterPages=footer)