import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Typography, message, Spin, Segmented } from 'antd';
import { motion } from 'framer-motion';
import {
  DollarCircleOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  LineChartOutlined,
  CrownOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import ApiService from '../api/ApiService';
import SalesByHourChart from '../components/dashboard/SalesByHourChart';
import TopProductsList from '../components/dashboard/TopProductsList';
import './DashboardPage.modern.css';

const { Title, Text } = Typography;

// --- COMPONENTE KpiCard ATUALIZADO E ROBUSTO ---
const KpiCard = ({ icon, title, value, prefix, loading, color, precision }) => {
  
  const formattedValue = useMemo(() => {
    if (loading) return '...';
    if (value === undefined || value === null) return '0';
    
    // 1. Força a conversão para número, caso venha como string da API
    const numValue = Number(value);

    // 2. Se for um número válido e tivermos uma precisão definida
    if (!isNaN(numValue) && precision !== undefined) {
      return numValue.toLocaleString('pt-BR', { 
        minimumFractionDigits: precision, 
        maximumFractionDigits: precision 
      });
    }
    
    // 3. Fallback: Se não tiver precisão, retorna o valor original ou o número convertido
    return isNaN(numValue) ? value : numValue;
  }, [value, precision, loading]);

  return (
    <motion.div whileHover={{ y: -5 }} className="kpi-card-wrapper">
      <div className="kpi-card" style={{ borderBottom: `3px solid ${color}` }}>
        <div className="kpi-icon" style={{ backgroundColor: color }}>
          {icon}
        </div>
        <div className="kpi-content">
          <Text type="secondary">{title}</Text>
          {loading ? (
            <Spin size="small" />
          ) : (
            <Title level={3} style={{ margin: 0 }}>
              {prefix}{formattedValue}
            </Title>
          )}
        </div>
      </div>
    </motion.div>
  );
};
// --- FIM DO COMPONENTE ---

const DashboardPage = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('today');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await ApiService.getDashboardSummary();
        setDashboardData(response.data);
      } catch (error) {
        message.error('Falha ao carregar os dados do dashboard.');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (value) => {
      const num = Number(value);
      return `R$ ${isNaN(num) ? '0,00' : num.toFixed(2).replace('.', ',')}`;
  };

  const kpisData = timeRange === 'today'
    ? dashboardData?.kpis_today
    : dashboardData?.kpis_last_7_days;

  return (
    <motion.div
      className="dashboard-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="dashboard-header">
        <div>
          <Title level={2} style={{ color: 'white', margin: 0 }}>Dashboard de Análise</Title>
          <Text style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Olá, seja bem-vindo(a) de volta!</Text>
        </div>
        <Segmented
          options={[
            { label: 'Hoje', value: 'today' },
            { label: 'Últimos 7 dias', value: '7d' },
          ]}
          value={timeRange}
          onChange={setTimeRange}
        />
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            icon={<DollarCircleOutlined />}
            title="Receita Total"
            value={kpisData?.total_revenue}
            prefix="R$ "
            loading={loading}
            color="#2ecc71"
            precision={2} // Força 2 casas decimais
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            icon={<ShoppingCartOutlined />}
            title="Total de Vendas"
            value={kpisData?.total_sales}
            loading={loading}
            color="#3498db"
            // Sem precision = número inteiro
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            icon={<LineChartOutlined />}
            title="Ticket Médio"
            value={kpisData?.average_ticket}
            prefix="R$ "
            loading={loading}
            color="#9b59b6"
            precision={2} // Força 2 casas decimais
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            icon={<TeamOutlined />}
            title="Novos Clientes"
            value={kpisData?.new_customers}
            loading={loading}
            color="#e67e22"
            // Sem precision
          />
        </Col>

        <Col xs={24} lg={12}>
            <TopProductsList
              title={<><CrownOutlined /> Top 5 Produtos por Receita (30 dias)</>}
              data={dashboardData?.top_5_products_by_revenue_last_30_days}
              loading={loading}
              valueKey="total_revenue_generated"
              valueFormatter={formatCurrency}
            />
        </Col>
        
        <Col xs={24} lg={12}>
            <TopProductsList
              title={<><BarChartOutlined /> Top 5 Produtos por Quantidade (30 dias)</>}
              data={dashboardData?.top_5_products_by_quantity_last_30_days}
              loading={loading}
              valueKey="total_quantity_sold"
              valueFormatter={(val) => `${val} un.`}
            />
        </Col>
        
        <Col span={24}>
          <SalesByHourChart data={dashboardData?.sales_by_hour_today} loading={loading} />
        </Col>
      </Row>
    </motion.div>
  );
};

export default DashboardPage;