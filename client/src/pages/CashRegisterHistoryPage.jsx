// client/src/pages/CashRegisterHistoryPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Table, Typography, Card, Tag, Space, Button, Input, Empty } from 'antd';
import { motion } from 'framer-motion';
import { 
    FireOutlined, 
    SearchOutlined, 
    ReloadOutlined, 
    CheckCircleOutlined 
} from '@ant-design/icons';
import ApiService from '../api/ApiService';

const { Title, Text } = Typography;

const PageStyles = () => (
    <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        .history-page-container { padding: 24px; background-color: #f0f2f5; font-family: 'Inter', sans-serif; min-height: 100vh; }
        .history-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding: 20px 24px; background: linear-gradient(135deg, #FF5630 0%, #FF8F73 100%); border-radius: 16px; color: white; box-shadow: 0 10px 30px -10px rgba(255, 86, 48, 0.5); }
        .controls-container { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding: 16px; background-color: #fff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); gap: 16px; flex-wrap: wrap; }
        .filters-area { display: flex; gap: 12px; flex: 1; align-items: center; }
        .history-table-card { border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: none; overflow: hidden; }
        .history-table .ant-table-thead > tr > th { background-color: #fafafa; font-weight: 600; color: #333; border-bottom: 1px solid #f0f0f0; }
        .history-table .ant-table-tbody > tr > td { border-bottom: 1px solid #f0f0f0; padding: 16px; }
        .history-table .ant-table-tbody > tr:hover > td { background-color: #fff1f0; }
    `}</style>
);

const CashRegisterHistoryPage = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const response = await ApiService.getCashRegisterHistory();
            setHistory(response.data);
        } catch (error) {
            console.error('Erro ao buscar histórico de caixas', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    // Função ultra-segura para formatar dinheiro e evitar o "R$ NaN"
    const formatMoney = (val1, val2) => {
        // Tenta pegar o opening_balance, se não existir tenta initial_balance
        const val = val1 !== undefined && val1 !== null ? val1 : val2;
        
        if (val === null || val === undefined || val === '') return 'R$ 0,00';
        
        const num = parseFloat(val);
        if (isNaN(num)) return 'R$ 0,00';
        
        return `R$ ${num.toFixed(2).replace('.', ',')}`;
    };

    // Filtro local simples por data ou ID
    const filteredHistory = history.filter(item => {
        if (!searchText) return true;
        const searchLower = searchText.toLowerCase();
        const dateStr = new Date(item.opened_at).toLocaleDateString();
        return item.id.toString().includes(searchLower) || dateStr.includes(searchLower);
    });

    const columns = [
        {
            title: 'Caixa ID',
            dataIndex: 'id',
            key: 'id',
            width: '10%',
            render: (id) => <Text strong style={{ color: '#FF5630' }}>#{id}</Text>,
        },
        {
            title: 'Abertura',
            dataIndex: 'opened_at',
            key: 'opened_at',
            width: '25%',
            render: (text) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{new Date(text).toLocaleDateString('pt-BR')}</Text>
                    <Text type="secondary" style={{ fontSize: 13 }}>{new Date(text).toLocaleTimeString('pt-BR')}</Text>
                </Space>
            ),
        },
        {
            title: 'Fechamento',
            dataIndex: 'closed_at',
            key: 'closed_at',
            width: '25%',
            render: (text) => text ? (
                <Space direction="vertical" size={0}>
                    <Text strong>{new Date(text).toLocaleDateString('pt-BR')}</Text>
                    <Text type="secondary" style={{ fontSize: 13 }}>{new Date(text).toLocaleTimeString('pt-BR')}</Text>
                </Space>
            ) : (
                <Tag color="warning">Em Andamento</Tag>
            ),
        },
        {
            title: 'Fundo Inicial',
            key: 'opening_balance',
            width: '15%',
            render: (_, record) => (
                <Text>{formatMoney(record.opening_balance, record.initial_balance)}</Text>
            ),
        },
        {
            title: 'Valor Informado (Gaveta)',
            key: 'closing_balance',
            width: '15%',
            render: (_, record) => (
                record.closing_balance != null 
                    ? <Text strong style={{ color: '#0052CC' }}>{formatMoney(record.closing_balance)}</Text>
                    : <Text type="secondary">-</Text>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            align: 'right',
            width: '10%',
            render: (status) => (
                <Tag color={status === 'CLOSED' ? 'success' : 'processing'} style={{ margin: 0, fontWeight: 600 }}>
                    {status === 'CLOSED' ? 'FECHADO' : 'ABERTO'}
                </Tag>
            ),
        },
    ];

    return (
        <>
            <PageStyles />
            <motion.div className="history-page-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                
                {/* Header Estilizado */}
                <div className="history-header">
                    <Title level={2} style={{ color: 'white', margin: 0 }}>
                        <FireOutlined style={{ marginRight: 12 }} /> 
                        Histórico de Fechamentos
                    </Title>
                    <Button 
                        size="large" 
                        style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }} 
                        icon={<CheckCircleOutlined />}
                    >
                        Auditoria
                    </Button>
                </div>

                {/* Controles e Filtros */}
                <div className="controls-container">
                    <div className="filters-area">
                        <Input 
                            placeholder="Buscar por ID ou Data (Ex: 27/05/2026)" 
                            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />} 
                            value={searchText} 
                            onChange={e => setSearchText(e.target.value)} 
                            style={{ maxWidth: 350 }} 
                            size="large" 
                            allowClear 
                        />
                    </div>
                    <Button 
                        type="primary" 
                        size="large" 
                        icon={<ReloadOutlined />} 
                        onClick={fetchHistory}
                        style={{ background: '#FF5630', borderColor: '#FF5630' }}
                    >
                        Atualizar
                    </Button>
                </div>

                {/* Tabela */}
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                    <Card className="history-table-card" bodyStyle={{ padding: 0 }}>
                        <Table 
                            className="history-table" 
                            columns={columns} 
                            dataSource={filteredHistory} 
                            loading={loading} 
                            rowKey="id" 
                            pagination={{ pageSize: 10 }} 
                            locale={{ emptyText: <Empty description="Nenhum fechamento de caixa registrado." /> }} 
                        />
                    </Card>
                </motion.div>

            </motion.div>
        </>
    );
};

export default CashRegisterHistoryPage;