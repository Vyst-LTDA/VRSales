// client/src/pages/SalesHistoryPage.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Table, Card, Typography, message, Tag, Avatar, List, Space, 
  DatePicker, Button, Row, Col, Statistic, Input, Tooltip 
} from 'antd';
import { motion } from 'framer-motion';
import { 
  HistoryOutlined, DollarCircleOutlined, CreditCardOutlined, 
  QrcodeOutlined, FilePdfOutlined, SearchOutlined, 
  CalendarOutlined, RiseOutlined, ShoppingCartOutlined
} from '@ant-design/icons';
import ApiService from '../api/ApiService';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

// Ativa plugin de datas
dayjs.extend(isBetween);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const PageStyles = () => (
    <style>{`
    .sales-history-container { padding: 24px; background-color: #f0f2f5; font-family: 'Inter', sans-serif; min-height: 100vh; }
    
    /* Header Moderno */
    .sales-header-card {
        background: white;
        border-radius: 16px;
        padding: 24px;
        margin-bottom: 24px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 16px;
    }

    /* Cards de Resumo (Mini Dashboard) */
    .summary-card {
        background: white;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        height: 100%;
        border: 1px solid #f0f0f0;
        transition: transform 0.2s;
    }
    .summary-card:hover { transform: translateY(-2px); border-color: #1890ff; }

    .table-card { border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); border: none; }
    .ant-table-thead > tr > th { background: #fafafa !important; font-weight: 600 !important; }
    
    .action-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        flex-wrap: wrap;
        gap: 12px;
    }
    `}</style>
);

const SalesHistoryPage = () => {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingPdf, setLoadingPdf] = useState(false);
    
    // Filtros
    const [dateRange, setDateRange] = useState([dayjs(), dayjs()]); // Padrão: Hoje
    const [searchText, setSearchText] = useState('');

    const fetchSales = useCallback(async () => {
        setLoading(true);
        try {
            // Nota: Idealmente o backend aceitaria filtros de data. 
            // Aqui buscamos as últimas 100 e filtramos no front para agilidade imediata,
            // mas para produção pesada, filtre no backend.
            const response = await ApiService.get('/sales/?limit=200'); 
            setSales(response.data);
        } catch (error) {
            message.error('Falha ao carregar o histórico.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSales();
    }, [fetchSales]);

    // --- LÓGICA DE FILTRAGEM (Front-end) ---
    const filteredSales = useMemo(() => {
        if (!sales) return [];
        
        let result = sales;

        // 1. Filtro de Data
        if (dateRange && dateRange[0] && dateRange[1]) {
            const start = dateRange[0].startOf('day');
            const end = dateRange[1].endOf('day');
            result = result.filter(sale => dayjs(sale.created_at).isBetween(start, end, null, '[]'));
        }

        // 2. Filtro de Texto (Cliente, ID ou Vendedor)
        if (searchText) {
            const lower = searchText.toLowerCase();
            result = result.filter(sale => 
                sale.customer?.full_name?.toLowerCase().includes(lower) ||
                sale.user?.full_name?.toLowerCase().includes(lower) ||
                String(sale.id).includes(lower)
            );
        }

        return result;
    }, [sales, dateRange, searchText]);

    // --- CÁLCULO DOS TOTAIS (Para o Fechamento do Dia) ---
    const summary = useMemo(() => {
        const totalRevenue = filteredSales.reduce((acc, curr) => acc + curr.total_amount, 0);
        const totalSales = filteredSales.length;
        return { totalRevenue, totalSales };
    }, [filteredSales]);

    // --- GERAR RELATÓRIO PDF ---
    const handleGenerateDailyReport = async () => {
        if (!dateRange || !dateRange[0] || !dateRange[1]) {
            message.warning("Selecione um período para o relatório.");
            return;
        }

        setLoadingPdf(true);
        try {
            const startStr = dateRange[0].format('YYYY-MM-DD');
            const endStr = dateRange[1].format('YYYY-MM-DD');
            
            const response = await ApiService.getSalesByPeriodPdf(startStr, endStr);
            
            // Cria link para download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `fechamento_${startStr}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            
            message.success("Relatório de fechamento gerado!");
        } catch (error) {
            console.error(error);
            message.error("Erro ao gerar PDF.");
        } finally {
            setLoadingPdf(false);
        }
    };

    // --- RENDERIZAÇÃO DA TABELA ---
    const paymentMethodVisuals = {
      cash: { icon: <DollarCircleOutlined />, color: 'green', text: 'Dinheiro' },
      credit_card: { icon: <CreditCardOutlined />, color: 'blue', text: 'Crédito' },
      debit_card: { icon: <CreditCardOutlined />, color: 'cyan', text: 'Débito' },
      pix: { icon: <QrcodeOutlined />, color: 'purple', text: 'PIX' },
      other: { icon: <DollarCircleOutlined />, color: 'default', text: 'Outro' },
    };

    const columns = [
        { title: 'ID', dataIndex: 'id', key: 'id', width: 70, render: (t) => <Text strong>#{t}</Text> },
        {
            title: 'Data', dataIndex: 'created_at', key: 'created_at', 
            render: (text) => (
                <div style={{ lineHeight: '1.2' }}>
                    <div>{dayjs(text).format('DD/MM/YYYY')}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(text).format('HH:mm')}</Text>
                </div>
            ),
            sorter: (a, b) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
        },
        {
            title: 'Cliente', dataIndex: 'customer', key: 'customer',
            render: (customer) => customer ? <Text strong>{customer.full_name}</Text> : <Text type="secondary">Consumidor Final</Text>,
        },
        {
            title: 'Pagamento', dataIndex: 'payments', key: 'payments',
            render: (payments) => (
                <Space direction="vertical" size={0}>
                    {payments.map((p, idx) => {
                        const visual = paymentMethodVisuals[p.payment_method] || paymentMethodVisuals.other;
                        return (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                <span style={{ color: visual.color === 'green' ? '#52c41a' : '#1890ff' }}>{visual.icon}</span>
                                <span>{visual.text}: <b>R$ {p.amount.toFixed(2)}</b></span>
                            </div>
                        );
                    })}
                </Space>
            ),
        },
        {
            title: 'Total', dataIndex: 'total_amount', key: 'total_amount',
            align: 'right',
            render: (amount) => <Text strong style={{ fontSize: 16, color: '#389e0d' }}>R$ {amount.toFixed(2).replace('.', ',')}</Text>,
            sorter: (a, b) => a.total_amount - b.total_amount,
        },
    ];

    const expandedRowRender = (record) => (
        <List
            size="small"
            header={<Text type="secondary" style={{ fontSize: 12 }}>ITENS DA VENDA #{record.id}</Text>}
            dataSource={record.items}
            renderItem={(item) => (
                <List.Item>
                    <List.Item.Meta
                        avatar={<Avatar shape="square" src={item.product?.image_url} icon={<ShoppingCartOutlined />} />}
                        title={item.product?.name || 'Produto Removido'}
                        description={`${item.quantity}x R$ ${item.price_at_sale.toFixed(2)}`}
                    />
                    <div>R$ {(item.quantity * item.price_at_sale).toFixed(2)}</div>
                </List.Item>
            )}
            style={{ marginLeft: 30, background: '#f9f9f9', borderRadius: 8, padding: 12 }}
        />
    );

    return (
        <>
            <PageStyles />
            <motion.div className="sales-history-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                
                {/* 1. TÍTULO E RELATÓRIO */}
                <div className="sales-header-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ background: '#e6f7ff', padding: 10, borderRadius: '50%', color: '#1890ff' }}>
                            <HistoryOutlined style={{ fontSize: '24px' }} />
                        </div>
                        <div>
                            <Title level={3} style={{ margin: 0 }}>Histórico e Fechamento</Title>
                            <Text type="secondary">Consulte vendas e feche o caixa do dia</Text>
                        </div>
                    </div>
                    
                    <Button 
                        type="primary" 
                        icon={<FilePdfOutlined />} 
                        size="large" 
                        onClick={handleGenerateDailyReport}
                        loading={loadingPdf}
                        style={{ background: '#ff4d4f', borderColor: '#ff4d4f', height: 50, padding: '0 24px', fontSize: 16 }}
                    >
                        Imprimir Fechamento
                    </Button>
                </div>

                {/* 2. FILTROS E RESUMO */}
                <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
                    {/* Filtros */}
                    <Col xs={24} lg={14}>
                        <Card className="summary-card" bodyStyle={{ padding: 0 }}>
                            <Title level={5} style={{ marginBottom: 16 }}>Filtrar Período</Title>
                            <Space wrap>
                                <RangePicker 
                                    value={dateRange} 
                                    onChange={setDateRange} 
                                    format="DD/MM/YYYY"
                                    allowClear={false}
                                    size="large"
                                    ranges={{
                                        'Hoje': [dayjs(), dayjs()],
                                        'Ontem': [dayjs().subtract(1, 'days'), dayjs().subtract(1, 'days')],
                                        'Esta Semana': [dayjs().startOf('week'), dayjs().endOf('week')],
                                        'Este Mês': [dayjs().startOf('month'), dayjs().endOf('month')],
                                    }}
                                />
                                <Input 
                                    placeholder="Buscar Cliente ou ID..." 
                                    prefix={<SearchOutlined />} 
                                    value={searchText}
                                    onChange={e => setSearchText(e.target.value)}
                                    size="large"
                                    style={{ width: 250 }}
                                />
                            </Space>
                        </Card>
                    </Col>

                    {/* Cards de Resumo */}
                    <Col xs={12} lg={5}>
                        <Card className="summary-card">
                            <Statistic 
                                title="Faturamento no Período" 
                                value={summary.totalRevenue} 
                                precision={2} 
                                prefix={<span style={{color: '#52c41a'}}>R$</span>}
                                suffix={<RiseOutlined style={{ color: '#52c41a', fontSize: 16 }} />} 
                            />
                        </Card>
                    </Col>
                    <Col xs={12} lg={5}>
                        <Card className="summary-card">
                            <Statistic 
                                title="Vendas Realizadas" 
                                value={summary.totalSales} 
                                prefix={<ShoppingCartOutlined style={{ color: '#1890ff' }} />} 
                            />
                        </Card>
                    </Col>
                </Row>

                {/* 3. TABELA DE DADOS */}
                <Card className="table-card">
                    <Table
                        columns={columns}
                        dataSource={filteredSales}
                        loading={loading}
                        rowKey="id"
                        expandable={{ expandedRowRender, expandRowByClick: true }}
                        pagination={{ pageSize: 10, showSizeChanger: true }}
                        locale={{ emptyText: <div style={{ padding: 40, textAlign: 'center' }}><CalendarOutlined style={{ fontSize: 40, color: '#ddd' }} /><p>Nenhuma venda encontrada neste período.</p></div> }}
                    />
                </Card>
            </motion.div>
        </>
    );
};

export default SalesHistoryPage;