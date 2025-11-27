import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Row, Col, Typography, message, Segmented, Button, Skeleton, Card, Tooltip, Space } from 'antd';
import { motion } from 'framer-motion';
import {
  DollarCircleOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  LineChartOutlined,
  CrownOutlined,
  BarChartOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import ApiService from '../api/ApiService';
import SalesByHourChart from '../components/dashboard/SalesByHourChart';
import TopProductsList from '../components/dashboard/TopProductsList';
import './DashboardPage.modern.css';

const { Title, Text } = Typography;

// --- COMPONENTE KpiCard ATUALIZADO (Com Skeleton) ---
const KpiCard = ({ icon, title, value, prefix, loading, color, precision }) => {
  
  const formattedValue = useMemo(() => {
    if (value === undefined || value === null) return '0';
    const numValue = Number(value);

    if (!isNaN(numValue) && precision !== undefined) {
      return numValue.toLocaleString('pt-BR', { 
        minimumFractionDigits: precision, 
        maximumFractionDigits: precision 
      });
    }
    return isNaN(numValue) ? value : numValue;
  }, [value, precision]);

  return (
    <motion.div 
      whileHover={{ y: -5 }} 
      transition={{ type: "spring", stiffness: 300 }}
      className="kpi-card-wrapper"
    >
      <div className="kpi-card" style={{ borderBottom: `4px solid ${color}` }}>
        <div className="kpi-header">
            <div className="kpi-icon-wrapper" style={{ backgroundColor: `${color}20`, color: color }}>
                {icon}
            </div>
            <Text type="secondary" className="kpi-title">{title}</Text>
        </div>
        
        <div className="kpi-value-container">
          <Skeleton loading={loading} active paragraph={false} title={{ width: 120 }}>
            <Title level={3} style={{ margin: 0, color: '#2c3e50' }}>
              <span style={{ fontSize: '0.6em', color: '#7f8c8d', marginRight: 4 }}>{prefix}</span>
              {formattedValue}
            </Title>
          </Skeleton>
        </div>
      </div>
    </motion.div>
  );
};

const DashboardPage = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('today');

  const fetchDashboardData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatCurrency = useCallback((value) => {
      const num = Number(value);
      return `R$ ${isNaN(num) ? '0,00' : num.toFixed(2).replace('.', ',')}`;
  }, []);

  const kpisData = useMemo(() => {
      if (!dashboardData) return {};
      return timeRange === 'today'
        ? dashboardData.kpis_today
        : dashboardData.kpis_last_7_days;
  }, [dashboardData, timeRange]);

  // Container de animação para os cards entrarem em sequência
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <motion.div
      className="dashboard-page"
      initial="hidden"
      animate="show"
      variants={containerVariants}
    >
      {/* --- HEADER --- */}
      <div className="dashboard-header-container">
        <div className="header-text">
          <Title level={2} style={{ margin: 0 }}>Dashboard</Title>
          <Text type="secondary">Visão geral do desempenho da sua loja</Text>
        </div>
        
        <div className="header-actions">
            <Tooltip title="Atualizar dados">
                <Button 
                    icon={<ReloadOutlined spin={loading} />} 
                    onClick={fetchDashboardData} 
                    shape="circle"
                    size="large"
                    style={{ marginRight: 16, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                />
            </Tooltip>
            <Segmented
            size="large"
            options={[
                { label: 'Hoje', value: 'today' },
                { label: '7 Dias', value: '7d' },
            ]}
            value={timeRange}
            onChange={setTimeRange}
            className="custom-segmented"
            />
        </div>
      </div>

      {/* --- KPIs --- */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
            <motion.div variants={itemVariants}>
              <KpiCard
                icon={<DollarCircleOutlined style={{ fontSize: 24 }} />}
                title="Receita"
                value={kpisData?.total_revenue}
                prefix="R$"
                loading={loading}
                color="#00b894" // Verde Menta
                precision={2}
              />
            </motion.div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
            <motion.div variants={itemVariants}>
              <KpiCard
                icon={<ShoppingCartOutlined style={{ fontSize: 24 }} />}
                title="Vendas"
                value={kpisData?.total_sales}
                loading={loading}
                color="#0984e3" // Azul Brilhante
              />
            </motion.div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
            <motion.div variants={itemVariants}>
              <KpiCard
                icon={<LineChartOutlined style={{ fontSize: 24 }} />}
                title="Ticket Médio"
                value={kpisData?.average_ticket}
                prefix="R$"
                loading={loading}
                color="#6c5ce7" // Roxo
                precision={2}
              />
            </motion.div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
            <motion.div variants={itemVariants}>
              <KpiCard
                icon={<TeamOutlined style={{ fontSize: 24 }} />}
                title="Novos Clientes"
                value={kpisData?.new_customers}
                loading={loading}
                color="#e17055" // Laranja
              />
            </motion.div>
        </Col>
      </Row>

      {/* --- LISTAS TOP 5 --- */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
            <motion.div variants={itemVariants} style={{ height: '100%' }}>
                <Card 
                    loading={loading} 
                    bordered={false} 
                    className="dashboard-content-card"
                    title={<Space><CrownOutlined style={{ color: '#f1c40f' }} /> Top Produtos (Receita - 30d)</Space>}
                >
                    <TopProductsList
                    data={dashboardData?.top_5_products_by_revenue_last_30_days}
                    loading={loading}
                    valueKey="total_revenue_generated"
                    valueFormatter={formatCurrency}
                    />
                </Card>
            </motion.div>
        </Col>
        
        <Col xs={24} lg={12}>
            <motion.div variants={itemVariants} style={{ height: '100%' }}>
                <Card 
                    loading={loading} 
                    bordered={false} 
                    className="dashboard-content-card"
                    title={<Space><BarChartOutlined style={{ color: '#3498db' }} /> Top Produtos (Qtd - 30d)</Space>}
                >
                    <TopProductsList
                    data={dashboardData?.top_5_products_by_quantity_last_30_days}
                    loading={loading}
                    valueKey="total_quantity_sold"
                    valueFormatter={(val) => `${val} un.`}
                    />
                </Card>
            </motion.div>
        </Col>
      </Row>
      
      {/* --- GRÁFICO --- */}
      <motion.div variants={itemVariants}>
        <Card 
            bordered={false} 
            className="dashboard-content-card"
            bodyStyle={{ padding: '24px' }}
        >
            <Skeleton active loading={loading} paragraph={{ rows: 6 }}>
                <Title level={4} style={{ marginBottom: 24 }}>Vendas por Hora (Hoje)</Title>
                <div style={{ height: 350 }}>
                    <SalesByHourChart data={dashboardData?.sales_by_hour_today} loading={loading} />
                </div>
            </Skeleton>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default DashboardPage;