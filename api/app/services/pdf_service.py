# api/app/services/pdf_service.py
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

# --- NOVO: Importações para Gráficos ---
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.legends import Legend
from reportlab.graphics.widgets.markers import makeMarker
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.legends import Legend as PieLegend # Renomear para evitar conflito
from reportlab.lib.validators import Auto
# --- FIM: Importações para Gráficos ---

from datetime import date, datetime
from typing import Dict, Any, List
import io
# from loguru import logger # Descomente se precisar para debug

# Importar schemas e modelos
from app.schemas.report import SalesByPeriod, SalesByUser, SalesByPaymentMethodItem, SalesByCategoryItem, TopSellingProduct
from app.models.store import Store

# --- Função format_currency (sem alterações) ---
def format_currency(value: float) -> str:
    if value is None: return "R$ -"
    try:
        return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    except (TypeError, ValueError): return str(value)

# --- Função create_styled_table (Cores Atualizadas) ---
def create_styled_table(data: List[List[Any]], col_widths: List[float] = None) -> Table:
    """Cria um objeto Table do ReportLab com estilo azulado."""
    # Definição de Cores (Exemplo - ajuste conforme sua identidade visual)
    header_bg_color = colors.HexColor('#2575FC') # Azul mais escuro (do Gradiente Header Reserva)
    header_text_color = colors.white
    row_bg_color_odd = colors.HexColor('#F0F5FF') # Azul bem claro
    row_bg_color_even = colors.white
    grid_color = colors.lightgrey

    table = Table(data, colWidths=col_widths)
    style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), header_bg_color),
        ('TEXTCOLOR', (0, 0), (-1, 0), header_text_color),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10), # Mais padding no header
        ('GRID', (0, 0), (-1, -1), 0.5, grid_color), # Grid mais sutil
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('ALIGN', (0, 1), (0, -1), 'LEFT'),
        ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8), # Mais padding
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ])
    # Aplicar estilo zebrado com novas cores
    for i in range(1, len(data)):
        bg_color = row_bg_color_even if i % 2 == 0 else row_bg_color_odd
        style.add('BACKGROUND', (0, i), (-1, i), bg_color)

    table.setStyle(style)
    return table

# --- NOVO: Função para Criar Gráfico de Barras ---
def create_sales_by_user_bar_chart(sales_data: List[SalesByUser]) -> Drawing:
    """Cria um gráfico de barras verticais para vendas por vendedor."""
    drawing = Drawing(400, 200) # Largura e Altura do gráfico
    data = [(user.total_sales_amount,) for user in sales_data] # Dados formatados para o gráfico
    
    bc = VerticalBarChart()
    bc.x = 50
    bc.y = 50
    bc.height = 125
    bc.width = 300
    bc.data = data
    bc.strokeColor = colors.black
    bc.valueAxis.valueMin = 0 # Eixo Y começa em 0
    bc.valueAxis.valueStep = None # Deixar o reportlab calcular os passos
    bc.valueAxis.labelTextFormat = lambda v: format_currency(v) # Formatar eixo Y como moeda
    bc.categoryAxis.labels.boxAnchor = 'ne'
    bc.categoryAxis.labels.dx = 8
    bc.categoryAxis.labels.dy = -2
    bc.categoryAxis.labels.angle = 30
    bc.categoryAxis.categoryNames = [user.user_full_name[:15] + ('...' if len(user.user_full_name) > 15 else '') for user in sales_data] # Nomes no eixo X (limitados)

    # Cores das barras (exemplo)
    bar_color = colors.HexColor('#6A11CB') # Roxo (do Gradiente Header Global)
    bc.bars[0].fillColor = bar_color

    drawing.add(bc)

    # Legenda (opcional, útil se tiver mais de uma série de dados)
    # legend = Legend()
    # legend.alignment = 'right'
    # legend.x = drawing.width - 10
    # legend.y = drawing.height - 10
    # legend.colorNamePairs = [(bar_color, 'Valor Vendido')]
    # drawing.add(legend)

    return drawing

def create_payment_method_pie_chart(payment_data: List[SalesByPaymentMethodItem]) -> Drawing:
    """Cria um gráfico de pizza para vendas por meio de pagamento."""
    drawing = Drawing(400, 200) # Largura e Altura da área do gráfico
    data = [p.total_amount for p in payment_data if p.total_amount > 0] # Apenas valores positivos
    labels = [p.payment_method.replace('_', ' ').title() for p in payment_data if p.total_amount > 0]

    if not data: # Se não houver dados, retorna um drawing vazio
        return drawing

    pc = Pie()
    pc.x = 65  # Posição X do centro da pizza
    pc.y = 10  # Posição Y do centro da pizza
    pc.width = 130 # Largura da pizza
    pc.height = 130 # Altura da pizza
    pc.data = data
    pc.labels = labels

    # Estilo das fatias e rótulos
    pc.slices.strokeWidth = 0.5
    pc.slices.labelRadius = 1.1 # Distância dos rótulos do centro
    pc.slices.fontSize = 9
    pc.sideLabels = 1 # Rótulos fora da pizza
    # Formatar rótulos como porcentagem (opcional)
    # total = sum(data)
    # pc.labelFormatter = lambda val: f'{(val/total)*100:.1f}%' if total > 0 else ''

    # Cores das fatias (exemplo - pode adicionar mais cores se tiver mais métodos)
    colors_palette = [
        colors.HexColor('#2575FC'), # Azul
        colors.HexColor('#6A11CB'), # Roxo
        colors.HexColor('#2ecc71'), # Verde
        colors.HexColor('#f39c12'), # Laranja
        colors.grey,
        colors.pink,
    ]
    for i, _ in enumerate(data):
        pc.slices[i].fillColor = colors_palette[i % len(colors_palette)]

    drawing.add(pc)

    # Legenda à direita
    legend = PieLegend()
    legend.alignment = 'right'
    legend.x = drawing.width - 50 # Posição X da legenda
    legend.y = drawing.height / 2 + (len(labels) * 12 / 2) # Ajusta Y baseado no número de itens
    legend.columnMaximum = 10 # Máximo de itens por coluna
    legend.colorNamePairs = [(pc.slices[i].fillColor, labels[i]) for i in range(len(data))]
    legend.fontSize = 9
    legend.boxAnchor = 'ne' # Ancora no Nordeste (canto superior direito)

    drawing.add(legend)

    return drawing

# --- Função Principal de Geração (com Gráfico Integrado) ---
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
    """Gera o conteúdo de um PDF aprimorado usando ReportLab."""

    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            leftMargin=2*cm, rightMargin=2*cm,
                            topMargin=3*cm, bottomMargin=2.5*cm)
    styles = getSampleStyleSheet()
    story = []

    # --- Estilos (como antes) ---
    title_style = ParagraphStyle( name='ReportTitle', parent=styles['h1'], fontSize=18, alignment=TA_CENTER, spaceAfter=6)
    subtitle_style = ParagraphStyle( name='ReportSubtitle', parent=styles['h2'], fontSize=12, alignment=TA_CENTER, spaceAfter=20)
    section_title_style = ParagraphStyle( name='SectionTitle', parent=styles['h3'], fontSize=14, spaceBefore=15, spaceAfter=8)
    summary_text_style = ParagraphStyle( name='SummaryText', parent=styles['Normal'], fontSize=11, spaceAfter=3)

    # --- Cabeçalho e Rodapé (como antes) ---
    def header(canvas, doc):
        canvas.saveState()
        page_width = doc.width + doc.leftMargin + doc.rightMargin
        header_y = doc.pagesize[1] - doc.topMargin
        canvas.setFont('Helvetica-Bold', 16); canvas.setFillColorRGB(0.1, 0.32, 0.78)
        canvas.drawString(doc.leftMargin, header_y + 1.2*cm, "VR Sales")
        canvas.setFont('Helvetica', 9); canvas.setFillColor(colors.black)
        canvas.drawRightString(page_width - doc.rightMargin, header_y + 1.4*cm, store.name)
        canvas.setFillColor(colors.grey)
        canvas.drawRightString(page_width - doc.rightMargin, header_y + 1.0*cm, store.address or "Endereço não cadastrado")
        canvas.setStrokeColorRGB(0.9, 0.9, 0.9)
        canvas.line(doc.leftMargin, header_y + 0.7*cm, page_width - doc.rightMargin, header_y + 0.7*cm)
        canvas.restoreState()

    def footer(canvas, doc):
        canvas.saveState()
        page_width = doc.width + doc.leftMargin + doc.rightMargin
        footer_y = doc.bottomMargin
        canvas.setStrokeColorRGB(0.9, 0.9, 0.9)
        canvas.line(doc.leftMargin, footer_y - 0.2*cm, page_width - doc.rightMargin, footer_y - 0.2*cm)
        canvas.setFont('Helvetica', 8); canvas.setFillColor(colors.grey)
        canvas.drawString(doc.leftMargin, footer_y - 0.6*cm, f"Relatório gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
        canvas.drawRightString(page_width - doc.rightMargin, footer_y - 0.6*cm, f"Página {canvas.getPageNumber()}")
        canvas.restoreState()

    # --- Conteúdo do Relatório ---
    story.append(Paragraph("Relatório de Vendas", title_style))
    story.append(Paragraph(f"Período: {start_date.strftime('%d/%m/%Y')} a {end_date.strftime('%d/%m/%Y')}", subtitle_style))

    # 1. Resumo Geral
    story.append(Paragraph("Resumo Geral", section_title_style))
    story.append(Paragraph(f"<b>Receita Total:</b> {format_currency(summary_data.total_sales_amount)}", summary_text_style))
    story.append(Paragraph(f"<b>Número de Vendas:</b> {summary_data.number_of_transactions}", summary_text_style))
    story.append(Paragraph(f"<b>Ticket Médio:</b> {format_currency(summary_data.average_ticket)}", summary_text_style))
    story.append(Spacer(1, 0.8*cm))

    # 2. Vendas por Vendedor (Tabela e Gráfico)
    if sales_by_user:
        story.append(Paragraph("Vendas por Vendedor", section_title_style))
        # Adiciona o Gráfico
        user_chart = create_sales_by_user_bar_chart(sales_by_user)
        story.append(user_chart)
        story.append(Spacer(1, 0.5*cm)) # Espaço entre gráfico e tabela
        # Adiciona a Tabela
        user_data = [["Vendedor", "Nº Vendas", "Valor Total"]]
        user_data.extend([
            [Paragraph(user.user_full_name, styles['Normal']), user.number_of_transactions, format_currency(user.total_sales_amount)]
            for user in sales_by_user
        ])
        table_width = doc.width
        user_table = create_styled_table(user_data, col_widths=[table_width*0.5, table_width*0.2, table_width*0.3])
        story.append(user_table)
        story.append(Spacer(1, 0.8*cm))

    # 3. Vendas por Meio de Pagamento
    if sales_by_payment:
        story.append(Paragraph("Vendas por Meio de Pagamento", section_title_style))
        # --- Adiciona o Gráfico de Pizza ---
        payment_chart = create_payment_method_pie_chart(sales_by_payment)
        story.append(payment_chart)
        story.append(Spacer(1, 0.5*cm)) # Espaço entre gráfico e tabela
        # --- Fim Adição Gráfico ---
        # Tabela (como antes)
        payment_data = [["Meio de Pagamento", "Nº Transações", "Valor Total"]]
        payment_data.extend([
            [Paragraph(p.payment_method.replace('_', ' ').title(), styles['Normal']), p.transaction_count, format_currency(p.total_amount)]
            for p in sales_by_payment
        ])
        table_width = doc.width
        payment_table = create_styled_table(payment_data, col_widths=[table_width*0.4, table_width*0.3, table_width*0.3])
        story.append(payment_table)
        story.append(Spacer(1, 0.8*cm))

    # 4. Vendas por Categoria
    if sales_by_category:
        story.append(Paragraph("Vendas por Categoria", section_title_style))
        category_data = [["Categoria", "Nº Vendas", "Valor Total"]]
        category_data.extend([
            [Paragraph(c.category_name, styles['Normal']), c.transaction_count, format_currency(c.total_amount)]
            for c in sales_by_category
        ])
        table_width = doc.width
        category_table = create_styled_table(category_data, col_widths=[table_width*0.5, table_width*0.2, table_width*0.3])
        story.append(category_table)
        story.append(Spacer(1, 0.8*cm))

    # 5. Top Produtos
    if top_products:
        story.append(Paragraph("Produtos Mais Vendidos no Período", section_title_style))
        product_data = [["Produto", "Qtd Vendida", "Receita Gerada"]]
        product_data.extend([
            [Paragraph(p.product_name, styles['Normal']), p.total_quantity_sold, format_currency(p.total_revenue)]
            for p in top_products
        ])
        table_width = doc.width
        product_table = create_styled_table(product_data, col_widths=[table_width*0.5, table_width*0.2, table_width*0.3])
        story.append(product_table)
        story.append(Spacer(1, 0.8*cm))

    # --- Construir o PDF ---
    doc.build(story, onFirstPage=lambda canvas, doc: (header(canvas, doc), footer(canvas, doc)),
                     onLaterPages=lambda canvas, doc: (header(canvas, doc), footer(canvas, doc)))