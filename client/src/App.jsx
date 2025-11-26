// client/src/App.jsx
import React, { useState } from 'react';
import { Layout, Menu, Typography, Avatar, Space, Dropdown, Button, Drawer } from 'antd';
import {
  UserOutlined, LogoutOutlined, SettingOutlined,
  ArrowLeftOutlined, AppstoreOutlined, HomeOutlined
} from '@ant-design/icons';
import { Routes, Route, useNavigate, useLocation, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';

// Importe suas páginas
import HomePage from './pages/HomePage'; // IMPORTANTE: O novo Hub
import SalesHistoryPage from './pages/SalesHistoryPage';
import LoginPage from './pages/LoginPage';
import OpenCashRegisterPage from './pages/OpenCashRegisterPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import DashboardPage from './pages/DashboardPage';
import POSPage from './pages/POSPage';
import ProductPage from './pages/ProductPage';
import CustomerPage from './pages/CustomerPage';
import SupplierPage from './pages/SupplierPage';
import TableManagementPage from './pages/TableManagementPage';
import ExpirationControlPage from './pages/ExpirationControlPage';
import MarketingPage from './pages/MarketingPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import KDSPage from './pages/KDSPage';
import FloorPlanSettingsPage from './pages/FloorPlanSettingsPage';
import GlobalDashboardPage from './pages/superadmin/GlobalDashboardPage';
import StoresManagementPage from './pages/superadmin/StoresManagementPage';
import ReservationPage from './pages/ReservationPage';
import RoleBasedRoute from './components/RoleBasedRoute';

const { Header, Content } = Layout;
const { Text, Title } = Typography;

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  // eslint-disable-next-line no-unused-vars
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);

  const isHomePage = location.pathname === '/';

  // Mapa de títulos para o Cabeçalho
  const pageTitles = {
    '/': 'Início',
    '/pos': 'Frente de Caixa',
    '/dashboard': 'Dashboard',
    '/sales-history': 'Histórico de Vendas',
    '/products': 'Gestão de Produtos',
    '/tables': 'Mesas e Comandas',
    '/customers': 'Clientes',
    '/reservations': 'Reservas',
    '/kds': 'Cozinha (KDS)',
    '/marketing': 'Marketing',
    '/reports': 'Relatórios',
    '/suppliers': 'Fornecedores',
    '/users': 'Usuários',
    '/settings/floor-plan': 'Layout do Salão',
    '/expiration': 'Controle de Validade',
    '/global-dashboard': 'Visão Global',
    '/stores': 'Gerir Lojas'
  };

  const currentTitle = pageTitles[location.pathname] || 'VR Sales';

  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: 'Meu Perfil' },
    { key: 'settings', icon: <SettingOutlined />, label: 'Configurações' },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Sair', danger: true, onClick: logout },
  ];

  // Menu Rápido (Reutiliza a HomePage dentro de um Drawer se quiser, ou navegação simples)
  // Por simplicidade, o botão Home já serve como menu rápido para voltar ao Hub.

  if (!user) { return <Navigate to="/login" replace />; }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      {/* HEADER FLUTUANTE/FIXO MODERNO */}
      <Header
        style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          zIndex: 10,
          position: 'sticky',
          top: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Botão Voltar ou Logo */}
          {!isHomePage ? (
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/')}
              style={{ fontSize: '16px' }}
            />
          ) : (
            <div style={{
              background: '#0052CC', color: 'white', fontWeight: 'bold',
              padding: '4px 12px', borderRadius: '6px'
            }}>
              VR
            </div>
          )}

          <Title level={4} style={{ margin: 0, fontSize: '18px' }}>
            {currentTitle}
          </Title>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Botão para ir para a Home rapidamente se estiver em outra página */}
          {!isHomePage && (
            <Button
              shape="circle"
              icon={<AppstoreOutlined />}
              onClick={() => navigate('/')}
              title="Menu Principal"
            />
          )}

          <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
            <a onClick={(e) => e.preventDefault()} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Text strong>{user.full_name || 'Usuário'}</Text>
              <Avatar style={{ backgroundColor: '#0052CC' }} icon={<UserOutlined />} />
            </a>
          </Dropdown>
        </div>
      </Header>

      <Content style={{ margin: '24px', overflow: 'initial' }}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <Outlet />
        </motion.div>
      </Content>
    </Layout>
  );
};

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/open-cash-register" element={<OpenCashRegisterPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Rota Raiz agora usa o MainLayout modificado */}
      <Route path="/" element={<MainLayout />}>

        {/* A Rota INDEX agora é a HomePage (O Hub) */}
        <Route index element={<HomePage />} />

        {/* Rotas Super Admin */}
        <Route element={<RoleBasedRoute allowedRoles={['super_admin']} />}>
          <Route path="global-dashboard" element={<GlobalDashboardPage />} />
          <Route path="stores" element={<StoresManagementPage />} />
        </Route>

        {/* Rotas Admin e Manager */}
        <Route element={<RoleBasedRoute allowedRoles={['admin', 'manager']} />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="suppliers" element={<SupplierPage />} />
          <Route path="marketing" element={<MarketingPage />} />
          <Route path="kds" element={<KDSPage />} />
          <Route path="sales-history" element={<SalesHistoryPage />} />
        </Route>

        <Route element={<RoleBasedRoute allowedRoles={['admin', 'super_admin']} />}>
            <Route path="users" element={<UsersPage />} />
        </Route>

        {/* Rotas Admin, Manager e Cashier */}
        <Route element={<RoleBasedRoute allowedRoles={['admin', 'manager', 'cashier']} />}>
            <Route path="pos" element={<POSPage />} />
            <Route path="tables" element={<TableManagementPage />} />
            <Route path="customers" element={<CustomerPage />} />
            <Route path="reservations" element={<ReservationPage />} />
            <Route path="products" element={<ProductPage />} />
            <Route path="expiration" element={<ExpirationControlPage />} />
        </Route>

        {/* Rotas Admin e Cashier */}
        <Route element={<RoleBasedRoute allowedRoles={['admin', 'cashier']} />}>
            <Route path="settings/floor-plan" element={<FloorPlanSettingsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default App;