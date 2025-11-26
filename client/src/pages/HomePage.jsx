// client/src/pages/HomePage.jsx
import React from 'react';
import { Typography, Card, Row, Col, Statistic } from 'antd';
import { useNavigate } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import {
  ShoppingCartOutlined, PieChartOutlined, UserOutlined,
  AppstoreOutlined, TableOutlined, LineChartOutlined,
  RocketOutlined, FireOutlined, BookOutlined,
  TeamOutlined, SafetyCertificateOutlined, HistoryOutlined,
  CalendarOutlined, ShopOutlined, LayoutOutlined
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Definição de todos os módulos do sistema
  const allModules = [
    {
      title: 'Frente de Caixa',
      path: '/pos',
      icon: <ShoppingCartOutlined style={{ fontSize: '32px' }} />,
      color: '#0052CC', // Azul forte
      roles: ['admin', 'manager', 'cashier'],
      description: 'Realizar vendas e gerenciar caixa'
    },
    {
      title: 'Dashboard',
      path: '/dashboard',
      icon: <PieChartOutlined style={{ fontSize: '32px' }} />,
      color: '#00A3BF', // Ciano
      roles: ['admin', 'manager'],
      description: 'Visão geral e métricas'
    },
    {
      title: 'Histórico de Vendas',
      path: '/sales-history',
      icon: <HistoryOutlined style={{ fontSize: '32px' }} />,
      color: '#6554C0', // Roxo
      roles: ['admin', 'manager'],
      description: 'Consultar vendas passadas'
    },
    {
      title: 'Comandas',
      path: '/tables',
      icon: <TableOutlined style={{ fontSize: '32px' }} />,
      color: '#FF991F', // Laranja
      roles: ['admin', 'manager', 'cashier'],
      description: 'Mesas e pedidos em aberto'
    },
    {
      title: 'Produtos',
      path: '/products',
      icon: <AppstoreOutlined style={{ fontSize: '32px' }} />,
      color: '#36B37E', // Verde
      roles: ['admin', 'manager', 'cashier'],
      description: 'Catálogo e estoque'
    },
    {
      title: 'Painel da Cozinha',
      path: '/kds',
      icon: <FireOutlined style={{ fontSize: '32px' }} />,
      color: '#DE350B', // Vermelho
      roles: ['admin', 'manager'],
      description: 'Gerenciamento de pedidos KDS'
    },
    {
      title: 'Clientes',
      path: '/customers',
      icon: <UserOutlined style={{ fontSize: '32px' }} />,
      color: '#42526E', // Cinza azulado
      roles: ['admin', 'manager', 'cashier'],
      description: 'Base de clientes e fidelidade'
    },
    {
      title: 'Reservas',
      path: '/reservations',
      icon: <BookOutlined style={{ fontSize: '32px' }} />,
      color: '#8777D9', // Lilás
      roles: ['admin', 'manager', 'cashier'],
      description: 'Agendamento de mesas'
    },
    {
      title: 'Marketing',
      path: '/marketing',
      icon: <RocketOutlined style={{ fontSize: '32px' }} />,
      color: '#FF5630', // Vermelho alaranjado
      roles: ['admin', 'manager'],
      description: 'Campanhas e promoções'
    },
    {
      title: 'Relatórios',
      path: '/reports',
      icon: <LineChartOutlined style={{ fontSize: '32px' }} />,
      color: '#008DA6', // Teal
      roles: ['admin', 'manager'],
      description: 'Análise detalhada de dados'
    },
    {
      title: 'Fornecedores',
      path: '/suppliers',
      icon: <TeamOutlined style={{ fontSize: '32px' }} />,
      color: '#253858', // Navy
      roles: ['admin', 'manager'],
      description: 'Gestão de parceiros'
    },
    {
      title: 'Validade',
      path: '/expiration',
      icon: <CalendarOutlined style={{ fontSize: '32px' }} />,
      color: '#FFAB00', // Amarelo
      roles: ['admin', 'manager', 'cashier'],
      description: 'Controle de lotes'
    },
    {
      title: 'Layout',
      path: '/settings/floor-plan',
      icon: <LayoutOutlined style={{ fontSize: '32px' }} />,
      color: '#0065FF', // Azul
      roles: ['admin', 'cashier'],
      description: 'Configuração do salão'
    },
    {
      title: 'Usuários',
      path: '/users',
      icon: <SafetyCertificateOutlined style={{ fontSize: '32px' }} />,
      color: '#505F79', // Slate
      roles: ['admin', 'super_admin'],
      description: 'Controle de acesso'
    },
    // Itens Super Admin
    {
      title: 'Dashboard Global',
      path: '/global-dashboard',
      icon: <PieChartOutlined style={{ fontSize: '32px' }} />,
      color: '#0052CC',
      roles: ['super_admin'],
      description: 'Visão multi-lojas'
    },
    {
      title: 'Lojas',
      path: '/stores',
      icon: <ShopOutlined style={{ fontSize: '32px' }} />,
      color: '#36B37E',
      roles: ['super_admin'],
      description: 'Gestão de franquias'
    },
  ];

  // Filtra módulos baseado na role do usuário
  const accessibleModules = allModules.filter(module =>
    !module.roles || module.roles.includes(user?.role)
  );

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '40px', textAlign: 'center' }}>
        <Title level={2}>Olá, {user?.full_name?.split(' ')[0] || 'Usuário'}</Title>
        <Text type="secondary" style={{ fontSize: '16px' }}>O que você deseja gerenciar hoje?</Text>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
      >
        <Row gutter={[24, 24]} justify="center">
          {accessibleModules.map((module) => (
            <Col xs={24} sm={12} md={8} lg={6} xl={4} key={module.path}>
              <motion.div variants={item} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Card
                  hoverable
                  onClick={() => navigate(module.path)}
                  style={{
                    height: '100%',
                    borderRadius: '16px',
                    textAlign: 'center',
                    borderTop: `4px solid ${module.color}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '24px 12px'
                  }}
                  bodyStyle={{ padding: 0, width: '100%' }}
                >
                  <div
                    style={{
                      backgroundColor: `${module.color}15`, // Cor com transparência
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '16px',
                      margin: '0 auto',
                      color: module.color
                    }}
                  >
                    {module.icon}
                  </div>
                  <Title level={5} style={{ margin: '0 0 8px 0' }}>{module.title}</Title>
                  <Text type="secondary" style={{ fontSize: '12px' }}>{module.description}</Text>
                </Card>
              </motion.div>
            </Col>
          ))}
        </Row>
      </motion.div>
    </div>
  );
};

export default HomePage;