import React, { useState, useMemo } from 'react';
import { Layout, Menu, Typography, Avatar, Space, Dropdown, message } from 'antd';
import {
  DesktopOutlined, PieChartOutlined, TeamOutlined, UserOutlined, SettingOutlined,
  LogoutOutlined, ShoppingCartOutlined, AppstoreOutlined, LineChartOutlined,
  GlobalOutlined, ShopOutlined, SafetyCertificateOutlined, CalendarOutlined,
  TableOutlined, RocketOutlined, FireOutlined, LayoutOutlined, BookOutlined, HistoryOutlined
} from '@ant-design/icons';
import { Routes, Route, useNavigate, useLocation, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { motion } from 'framer-motion';

// Importe todas as suas páginas
import SalesHistoryPage from './pages/SalesHistoryPage'; // 2. IMPORTAR A NOVA PÁGINA
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

const { Header, Content, Sider } = Layout;
const { Text } = Typography;

// --- AJUSTE NOS MENUS PARA REFLETIR AS NOVAS PERMISSÕES VISUAIS ---
const storeMenuItems = [
   // Análise e Marketing (Admin, Manager)
    { label: 'Análise e Marketing', key: 'grp-analytics', type: 'group', roles: ['admin', 'manager'],
      children: [
        { key: '/dashboard', icon: <PieChartOutlined />, label: 'DashBoard', roles: ['admin', 'manager'] },
        { key: '/sales-history', icon: <HistoryOutlined />, label: 'Histórico de Vendas', roles: ['admin', 'manager'] },
        { key: '/reports', icon: <LineChartOutlined />, label: 'Relatórios', roles: ['admin', 'manager'] },
        { key: '/marketing', icon: <RocketOutlined />, label: 'Marketing', roles: ['admin', 'manager'] },
      ],
    },
    { type: 'divider', roles: ['admin', 'manager', 'cashier'] }, // Divider visível para todos
    // Vendas e Operações (Admin, Manager, Cashier)
    { label: 'Vendas e Operações', key: 'grp-sales', type: 'group', roles: ['admin', 'manager', 'cashier'],
      children: [
        { key: '/pos', icon: <ShoppingCartOutlined />, label: 'Frente de Caixa', roles: ['admin', 'manager', 'cashier'] },
        { key: '/tables', icon: <TableOutlined />, label: 'Comandas', roles: ['admin', 'manager', 'cashier'] },
        { key: '/settings/floor-plan', icon: <LayoutOutlined />, label: 'Layout do Salão', roles: ['admin', 'cashier'] }, // Cashier VÊ Layout
        { key: '/kds', icon: <FireOutlined />, label: 'Painel da Cozinha', roles: ['admin', 'manager'] }, // KDS só Admin/Manager
      ],
    },
    { type: 'divider', roles: ['admin', 'manager', 'cashier'] }, // Divider visível para todos
    // Reservas e Clientes (Admin, Manager, Cashier)
    { label: 'Clientes e Reservas', key: 'grp-cust-res', type: 'group', roles: ['admin', 'manager', 'cashier'],
        children: [
            { key: '/reservations', icon: <BookOutlined />, label: 'Reservas', roles: ['admin', 'manager', 'cashier'] }, // Cashier VÊ Reservas
            { key: '/customers', icon: <UserOutlined />, label: 'Clientes', roles: ['admin', 'manager', 'cashier'] },
        ],
    },
    { type: 'divider', roles: ['admin', 'manager'] }, // Divider só Admin/Manager
   
    // Gestão de Estoque (Admin, Manager, Cashier)
    { label: 'Gestão de Estoque', key: 'grp-management', type: 'group', roles: ['admin', 'manager', 'cashier'],
      children: [
        { key: '/products', icon: <AppstoreOutlined />, label: 'Produtos', roles: ['admin', 'manager', 'cashier'] }, // Cashier VÊ Produtos
        { key: '/suppliers', icon: <TeamOutlined />, label: 'Fornecedores', roles: ['admin', 'manager'] }, // Fornecedores só Admin/Manager
        { key: '/expiration', icon: <CalendarOutlined />, label: 'Validade', roles: ['admin', 'manager', 'cashier'] }, // Cashier VÊ Validade
      ],
    },
    { type: 'divider', roles: ['admin', 'super_admin'] }, // Divider só Admin/Super Admin
    // Administração (Admin, Super Admin)
    { label: 'Administração', key: 'grp-admin', type: 'group', roles: ['admin', 'super_admin'],
      children: [
        { key: '/users', icon: <SafetyCertificateOutlined />, label: 'Usuários', roles: ['admin', 'super_admin'] },
        // Layout já está em Vendas/Operações { key: '/settings/floor-plan', icon: <LayoutOutlined />, label: 'Layout do Salão', roles: ['admin'] },
      ],
    },
];
const superAdminMenuItems = [
    { key: '/global-dashboard', icon: <GlobalOutlined />, label: 'Dashboard Global' },
    { key: '/users', icon: <SafetyCertificateOutlined />, label: 'Gestão de Usuários' },
    { key: '/stores', icon: <ShopOutlined />, label: 'Gerir Lojas' },
];
// --- FIM DO AJUSTE NOS MENUS ---

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleMenuClick = ({ key }) => {
    if (key === 'logout') {
      logout();
    } else {
      navigate(key);
    }
  };

  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: 'Meu Perfil' },
    { key: 'settings', icon: <SettingOutlined />, label: 'Configurações' },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Sair', danger: true },
  ];

  // Lógica para filtrar itens de menu (mantida como na versão anterior)
  const accessibleMenuItems = useMemo(() => {
    if (!user) return [];
    const filterItems = (items) => {
        return items.reduce((acc, item) => {
            const isItemAccessible = !item.roles || item.roles.includes(user.role);
            if (isItemAccessible) {
                if (item.children) {
                    const accessibleChildren = item.children.filter(child => !child.roles || child.roles.includes(user.role));
                    if (accessibleChildren.length > 0) {
                        acc.push({ ...item, children: accessibleChildren });
                    }
                } else {
                    acc.push(item);
                }
            }
            return acc;
        }, []);
    };
    const baseItems = user.role === 'super_admin' ? superAdminMenuItems : storeMenuItems;
    return filterItems(baseItems);
  }, [user]);

  if (!user) { return <Navigate to="/login" replace />; }

  // --- LÓGICA DE REDIRECIONAMENTO INICIAL CORRIGIDA ---
  if (location.pathname === '/') {
    if (user.role === 'super_admin') {
      return <Navigate to="/global-dashboard" replace />;
    } else if (user.role === 'cashier') {
      // Caixa vai direto para o POS
      return <Navigate to="/pos" replace />;
    } else {
      // Admin e Manager vão para o Dashboard da loja
      return <Navigate to="/dashboard" replace />;
    }
  }
  // --- FIM DA CORREÇÃO DO REDIRECIONAMENTO ---

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="dark">
        <div style={{ height: '32px', margin: '16px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          {collapsed ? 'VR' : 'VR Sales'}
        </div>
        <Menu theme="dark" selectedKeys={[location.pathname]} mode="inline" items={accessibleMenuItems} onClick={handleMenuClick} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Dropdown menu={{ items: userMenuItems, onClick: handleMenuClick }} trigger={['click']}>
            <a onClick={(e) => e.preventDefault()} style={{ cursor: 'pointer' }}>
              <Space>
                <Avatar style={{ backgroundColor: '#1890ff' }} icon={<UserOutlined />} />
                <Text>{user.full_name || 'Usuário'}</Text>
              </Space>
            </a>
          </Dropdown>
        </Header>
        <Content style={{ margin: '16px', overflow: 'initial' }}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Outlet />
            </motion.div>
        </Content>
      </Layout>
    </Layout>
  );
};

// --- AJUSTE NAS ROTAS PROTEGIDAS ---
const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/open-cash-register" element={<OpenCashRegisterPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route path="/" element={<MainLayout />}>

        {/* Rotas Super Admin */}
        <Route element={<RoleBasedRoute allowedRoles={['super_admin']} />}>
          <Route path="global-dashboard" element={<GlobalDashboardPage />} />
          <Route path="stores" element={<StoresManagementPage />} />
          {/* A rota de usuários foi movida para um grupo compartilhado abaixo */}
        </Route>

        {/* Rotas Admin e Manager */}
        <Route element={<RoleBasedRoute allowedRoles={['admin', 'manager']} />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="suppliers" element={<SupplierPage />} />
          <Route path="marketing" element={<MarketingPage />} />
          <Route path="kds" element={<KDSPage />} />
          <Route path="sales-history" element={<SalesHistoryPage />} />
          {/* Produtos, Validade, Reservas movidos para grupo com Cashier */}
        </Route>

        {/* --- CORREÇÃO AQUI --- */}
        {/* Rotas Admin e Super Admin (Gerenciamento de Usuários) */}
        <Route element={<RoleBasedRoute allowedRoles={['admin', 'super_admin']} />}>
            <Route path="users" element={<UsersPage />} />
        </Route>
        {/* --- FIM DA CORREÇÃO --- */}


        {/* Rotas Admin, Manager e Cashier (Operações e Clientes) */}
        <Route element={<RoleBasedRoute allowedRoles={['admin', 'manager', 'cashier']} />}>
            <Route path="pos" element={<POSPage />} />
            <Route path="tables" element={<TableManagementPage />} />
            <Route path="customers" element={<CustomerPage />} />
            <Route path="reservations" element={<ReservationPage />} />
            <Route path="products" element={<ProductPage />} />
            <Route path="expiration" element={<ExpirationControlPage />} />
        </Route>

        {/* Rotas Admin e Cashier (Layout) */}
        <Route element={<RoleBasedRoute allowedRoles={['admin', 'cashier']} />}>
            <Route path="settings/floor-plan" element={<FloorPlanSettingsPage />} />
        </Route>

        {/* Rota Padrão */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};
// --- FIM DO AJUSTE NAS ROTAS ---

export default App;