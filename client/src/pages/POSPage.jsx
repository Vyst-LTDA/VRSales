// vyst-ltda/vrsales/VRSales-9c6c4fe15fb6b0affb34c6862f8639045de57ee6/client/src/pages/POSPage.jsx

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Layout, Input, Table, Avatar, Typography, Statistic, Button, Space, Divider, message, Modal, Image, Card, Spin, Tooltip, Empty, AutoComplete, Select, Form
} from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarcodeOutlined, ShoppingOutlined, PlusOutlined, MinusOutlined, DeleteOutlined,
  DollarCircleOutlined, CloseCircleOutlined, CameraOutlined, UserOutlined, WarningOutlined,
  StarFilled, MailOutlined, PhoneOutlined
} from '@ant-design/icons';
import ApiService from '../api/ApiService';
import dayjs from 'dayjs';
import PaymentModal from '../components/PaymentModal';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDebounce } from '../hooks/useDebounce';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

// Componente do formulário de cliente, usado no modal
const CustomerForm = ({ form, onFinish, onCancel }) => {
  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
    >
      <Form.Item
        name="full_name"
        label="Nome Completo"
        rules={[{ required: true, message: 'Por favor, insira o nome completo!' }]}
      >
        <Input prefix={<UserOutlined />} placeholder="Ex: João da Silva" size="large" />
      </Form.Item>
      <Form.Item
        name="email"
        label="E-mail"
        rules={[{ type: 'email', message: 'Por favor, insira um e-mail válido!' }]}
      >
        <Input prefix={<MailOutlined />} placeholder="Ex: joao.silva@email.com" size="large" />
      </Form.Item>
      <Form.Item
        name="phone_number"
        label="Telefone"
      >
        <Input prefix={<PhoneOutlined />} placeholder="Ex: (16) 99999-8888" size="large" />
      </Form.Item>
      <Form.Item style={{ textAlign: 'right', marginBottom: 0, marginTop: 24 }}>
        <Button onClick={onCancel} style={{ marginRight: 8 }} size="large">
          Cancelar
        </Button>
        <Button type="primary" htmlType="submit" size="large">
          Adicionar Cliente
        </Button>
      </Form.Item>
    </Form>
  );
};


// Estilos embutidos completos
const PageStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');

    .pos-page-layout {
      --primary-color: #0052CC;
      --primary-color-light: rgba(0, 82, 204, 0.05);
      --success-color-rgb: 0, 168, 120;
      --danger-color: #DE350B;
      --warning-color: #faad14;
      --page-bg: #F4F5F7;
      --card-bg: #FFFFFF;
      --text-primary: #172B4D;
      --text-secondary: #595959;
      --text-on-primary: #FFFFFF;
      --border-color: #e8e8e8;
      --zebra-stripe-color: #fafafa;
    }

    .pos-page-layout {
      height: 100vh;
      overflow: hidden;
      font-family: 'Inter', sans-serif;
      background-color: var(--page-bg);
      color: var(--text-primary);
      display: flex;
      flex-direction: column;
    }

    .pos-header {
      background: var(--primary-color);
      border-bottom: none;
      height: 72px;
      padding: 0 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: var(--text-on-primary);
      border-radius: 16px;
      margin: 16px 24px 0 24px;
      box-shadow: 0 8px 20px -5px rgba(0, 82, 204, 0.5);
    }

    .pos-header .ant-typography {
        color: var(--text-on-primary);
    }

    .pos-content-layout {
        padding: 16px 24px 24px 24px;
        background: transparent;
        flex: 1;
        min-height: 0;
    }

    .pos-main-content {
      display: flex; flex-direction: column;
      gap: 16px;
      height: 100%;
    }

    .clean-card {
        background: var(--card-bg); border-radius: 16px;
        border: none; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
        height: 100%;
    }

    .cart-table-card {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
    }

    .cart-table-card .ant-card-body {
        padding: 8px; height: 100%; display: flex; flex-direction: column;
    }

    .cart-table .ant-table-wrapper {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
    }

    .cart-table .ant-table-thead > tr > th {
        background-color: var(--primary-color-light);
        color: var(--primary-color);
        font-weight: 600;
    }

    .cart-table .ant-table-tbody > tr:nth-child(even) > td {
      background-color: var(--zebra-stripe-color);
    }

    @keyframes highlight-row {
      0% { background-color: rgba(var(--success-color-rgb), 0.25); }
      100% { background-color: transparent; }
    }
    .highlight-new-item td { animation: highlight-row 1.5s ease-out; }

    .search-input .ant-input-affix-wrapper {
        border-radius: 12px; background: var(--card-bg);
        border-color: #d9d9d9; box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }
    .search-input .ant-input-affix-wrapper:hover,
    .search-input .ant-input-affix-wrapper-focused {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 2px rgba(0, 82, 204, 0.1);
    }

    .pos-sider { background: transparent !important; padding-left: 24px; }

    .sider-container {
        display: flex; flex-direction: column; gap: 24px;
        height: 100%; background: var(--card-bg);
        border-radius: 16px; padding: 24px;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
        overflow-y: auto;
    }

    .payment-section {
      margin-top: auto;
      background-color: var(--page-bg);
      border-radius: 12px;
      padding: 16px;
    }

    .total-display { text-align: right; }
    .total-display .total-label { font-size: 1.1rem; color: var(--text-secondary); font-weight: 600; }
    .total-display .total-amount .ant-statistic-content {
        font-size: 3.5rem !important; font-weight: 900 !important;
        color: var(--primary-color) !important;
        line-height: 1 !important;
    }

    .action-buttons .ant-btn {
        height: 60px !important; font-size: 1.2rem !important;
        font-weight: 700; border-radius: 12px;
        transition: all 0.2s ease-in-out;
    }
    .action-buttons .ant-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
    }

    /* --- INÍCIO DA CORREÇÃO --- */
    .action-buttons .ant-btn-primary {
        background: var(--primary-color);
        border-color: var(--primary-color);
        color: white !important; /* Garante o contraste do texto */
    }
    .action-buttons .ant-btn-primary:hover {
        background: #0065ff; /* Tom mais claro de azul para hover */
        border-color: #0065ff;
    }
    .action-buttons .ant-btn-dangerous {
        background: var(--danger-color);
        border-color: var(--danger-color); /* Garante a cor da borda */
        color: white !important;
    }
    .action-buttons .ant-btn-dangerous:hover {
        background: #ff4d4f;
        border-color: #ff4d4f; /* Garante a cor da borda no hover */
    }
    /* --- FIM DA CORREÇÃO --- */

    .action-button-key {
        font-weight: 700; margin-right: 8px; padding: 2px 6px;
        border-radius: 4px; background: rgba(0,0,0,0.05); color: var(--text-secondary);
    }
    .ant-btn-primary .action-button-key, .ant-btn-dangerous .action-button-key {
        background: rgba(255,255,255,0.2);
        color: white;
    }

    .product-autocomplete-item, .customer-select-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .product-autocomplete-item img {
      width: 32px;
      height: 32px;
      object-fit: cover;
      border-radius: 4px;
    }
    .customer-select-item-info {
        display: flex;
        justify-content: space-between;
        width: 100%;
        align-items: center;
    }
  `}</style>
);


const POSPage = () => {
  const [cashRegisterStatus, setCashRegisterStatus] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const [cartItems, setCartItems] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(dayjs().format('DD/MM/YYYY HH:mm:ss'));
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [autocompleteOptions, setAutocompleteOptions] = useState([]);
  const [lastAddedItem, setLastAddedItem] = useState(null);
  
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearchValue, setCustomerSearchValue] = useState('');
  const [customerOptions, setCustomerOptions] = useState([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [isCustomerModalVisible, setIsCustomerModalVisible] = useState(false);
  const [customerForm] = Form.useForm();

  const searchInputRef = useRef(null);
  const customerSelectRef = useRef(null);

  const debouncedSearchValue = useDebounce(searchValue, 300);
  const debouncedCustomerSearch = useDebounce(customerSearchValue, 300);

  const handleOpenPaymentModal = useCallback(() => {
    if (cartItems.length === 0) {
      message.error('Adicione pelo menos um item ao carrinho para finalizar a venda.');
      return;
    }
    setIsPaymentModalOpen(true);
  }, [cartItems]);

  const handleCancelSale = useCallback(() => {
    if (cartItems.length === 0) return;
    Modal.confirm({
      title: 'Tem certeza?',
      content: 'Todos os itens serão removidos do carrinho e o cliente desassociado.',
      okText: 'Sim, Cancelar Venda',
      cancelText: 'Não',
      onOk: () => {
        setCartItems([]);
        setLastAddedItem(null);
        setSelectedCustomer(null);
        setSearchValue('');
        setAutocompleteOptions([]);
        setCustomerSearchValue('');
        setCustomerOptions([]);
        message.warning('Venda cancelada.');
        searchInputRef.current?.focus();
      },
    });
  }, [cartItems]);

  useEffect(() => {
    const checkCashRegister = async () => {
      try {
        const status = await ApiService.getCashRegisterStatus();
        setCashRegisterStatus(status.data);
      } catch (error) {
        if (error.response?.status === 404) {
          message.warning('Nenhum caixa aberto. Por favor, abra o caixa para começar.');
          navigate('/open-cash-register');
        } else {
          message.error('Erro ao verificar status do caixa.');
        }
      } finally {
        setPageLoading(false);
      }
    };
    checkCashRegister();
  }, [navigate]);

  useEffect(() => {
    if (location.state?.orderItems) {
      const itemsFromOrder = location.state.orderItems.map(item => ({ ...item, key: item.id }));
      setCartItems(itemsFromOrder);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  useEffect(() => {
    searchInputRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'F6') { event.preventDefault(); handleOpenPaymentModal(); }
      if (event.key === 'F3') { event.preventDefault(); handleCancelSale(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    const timer = setInterval(() => setCurrentTime(dayjs().format('DD/MM/YYYY HH:mm:ss')), 1000);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(timer);
    };
  }, [handleCancelSale, handleOpenPaymentModal]);

  const fetchProducts = useCallback(async (searchTerm = '') => {
    setSearchLoading(true);
    try {
      const limit = searchTerm ? 10 : 50;
      const response = await ApiService.get(`/products/?search=${searchTerm}&limit=${limit}`);
      const options = (response.data || []).map(product => ({
        value: product.name,
        label: (
          <div className="product-autocomplete-item">
            <img src={product.image_url || 'https://via.placeholder.com/32'} alt={product.name} />
            <div>
              <Text strong>{product.name}</Text><br />
              <Text type="secondary">R$ {product.price.toFixed(2)}</Text>
            </div>
          </div>
        ),
        key: product.id,
        productData: product
      }));
      setAutocompleteOptions(options);
    } catch {
      setAutocompleteOptions([]);
      message.error('Erro ao buscar produtos.');
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedSearchValue.length >= 2) {
      fetchProducts(debouncedSearchValue);
    } else if (debouncedSearchValue.length === 0) {
      setAutocompleteOptions([]);
    }
  }, [debouncedSearchValue, fetchProducts]);

  const handleProductInputFocus = () => {
    if (!searchValue && autocompleteOptions.length === 0) {
      fetchProducts();
    }
  };
  
  const addProductToCart = (productToAdd) => {
    const existingCartItem = cartItems.find(item => item.id === productToAdd.id);
    const quantityInCart = existingCartItem ? existingCartItem.quantity : 0;

    if (productToAdd.stock <= quantityInCart) {
        message.warning(`Atenção: Estoque do produto "${productToAdd.name}" está zerado ou negativo.`, 4);
    }
    
    setLastAddedItem(productToAdd);
    setCartItems(currentItems => {
        const existingItemIndex = currentItems.findIndex(item => item.id === productToAdd.id);
        if (existingItemIndex > -1) {
            const updatedItems = [...currentItems];
            updatedItems[existingItemIndex] = {
                ...updatedItems[existingItemIndex],
                quantity: updatedItems[existingItemIndex].quantity + 1,
            };
            return updatedItems;
        } else {
            return [{ ...productToAdd, quantity: 1, key: productToAdd.id }, ...currentItems];
        }
    });

    if (!existingCartItem) {
        message.success(`${productToAdd.name} adicionado!`);
    }

    setSearchValue('');
    setAutocompleteOptions([]);
    searchInputRef.current?.focus();
  };

  const onAutocompleteSelect = (_, option) => {
    addProductToCart(option.productData);
  };

  const handleExactSearch = async () => {
    if (!searchValue || autocompleteOptions.length > 0) return;
    setSearchLoading(true);
    try {
      const response = await ApiService.lookupProduct(searchValue);
      if (response.data.length > 0) {
        addProductToCart(response.data[0]);
      } else {
        message.warning('Produto não encontrado.');
      }
    } catch {
      message.error('Erro ao buscar o produto.');
    } finally {
      setSearchLoading(false);
      searchInputRef.current?.focus();
    }
  };
  
  const updateQuantity = (productId, amount) => {
    const itemToUpdate = cartItems.find(item => item.id === productId);
    if (!itemToUpdate) return;
  
    const newQuantity = itemToUpdate.quantity + amount;
  
    if (amount > 0 && newQuantity > itemToUpdate.stock) {
      message.warning(`Atenção: Estoque do produto "${itemToUpdate.name}" é de ${itemToUpdate.stock} unidades.`, 4);
    }
  
    setCartItems(currentItems =>
      currentItems
        .map(item => {
          if (item.id === productId) {
            return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  
    if (newQuantity <= 0) {
      message.info('Item removido.');
    }
  };

  const removeItem = (productId) => {
    setCartItems(currentItems => currentItems.filter(item => item.id !== productId));
    message.info('Item removido.');
  };

  const fetchCustomers = useCallback(async (searchValue = '', initialLoad = false) => {
    setCustomerLoading(true);
    try {
      const response = await ApiService.get('/customers/'); // Busca todos
      let customersData = response.data || [];

      if (searchValue) {
        customersData = customersData.filter(c =>
          c.full_name.toLowerCase().includes(searchValue.toLowerCase()) ||
          (c.phone_number && c.phone_number.includes(searchValue))
        );
      }

      const options = customersData.map(customer => ({
        value: customer.id,
        label: (
          <div className="customer-select-item">
            <div className="customer-select-item-info">
              <span>{customer.full_name}</span>
              <Text type="secondary">
                <StarFilled style={{ color: '#FFD700', marginRight: 4 }} />
                {customer.loyalty_points || 0}
              </Text>
            </div>
          </div>
        ),
        key: customer.id,
        customerData: customer
      }));
      setCustomerOptions(options);
    } catch {
      setCustomerOptions([]);
      message.error('Erro ao buscar clientes.');
    } finally {
      setCustomerLoading(false);
    }
  }, []);

  const handleCustomerDropdownVisibleChange = (open) => {
    if (open && customerOptions.length === 0) {
      fetchCustomers('', true);
    }
  };

  useEffect(() => {
    if (debouncedCustomerSearch.length >= 2) {
      fetchCustomers(debouncedCustomerSearch);
    } else if (debouncedCustomerSearch.length === 0 && customerSelectRef.current?.props.open) {
      fetchCustomers('', true);
    }
  }, [debouncedCustomerSearch, fetchCustomers]);

  const handleSelectCustomer = (value, option) => {
    setSelectedCustomer(option?.customerData || null);
    setCustomerSearchValue('');
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerSearchValue('');
    setCustomerOptions([]);
  };

  const handleCreateCustomer = async (values) => {
    try {
      const response = await ApiService.post('/customers/', values);
      message.success(`Cliente "${response.data.full_name}" criado com sucesso!`);
      setIsCustomerModalVisible(false);
      customerForm.resetFields();
      setSelectedCustomer(response.data);
      setCustomerOptions(prev => [...prev, {
        value: response.data.id,
        label: (
          <div className="customer-select-item">
            <div className="customer-select-item-info">
              <span>{response.data.full_name}</span>
              <Text type="secondary">
                <StarFilled style={{ color: '#FFD700', marginRight: 4 }} />
                {response.data.loyalty_points || 0}
              </Text>
            </div>
          </div>
        ),
        key: response.data.id,
        customerData: response.data
      }]);
    } catch (error) {
      message.error(error.response?.data?.detail || 'Erro ao criar cliente.');
    }
  };

  const handleSaleSuccess = () => {
    setIsPaymentModalOpen(false);
    setCartItems([]);
    setLastAddedItem(null);
    setSelectedCustomer(null);
    setSearchValue('');
    setAutocompleteOptions([]);
    setCustomerSearchValue('');
    setCustomerOptions([]);
    searchInputRef.current?.focus();
  };

  const { subtotal, totalItems } = useMemo(() => {
    return {
        subtotal: cartItems.reduce((acc, item) => acc + (item.price || 0) * (item.quantity || 0), 0),
        totalItems: cartItems.reduce((acc, item) => acc + (item.quantity || 0), 0)
    }
  }, [cartItems]);

  const cartColumns = [
    {
      title: 'Produto', dataIndex: 'name', key: 'name',
      render: (name, record) => (
        <Space>
          <Avatar shape="square" src={record.image_url} icon={<ShoppingOutlined />} />
          <Text>{name || 'Produto sem nome'}</Text>
          {(record.stock <= 0) && (
            <Tooltip title={`Estoque Negativo ou Zerado: ${record.stock}`}>
              <WarningOutlined style={{ color: 'var(--danger-color)' }} />
            </Tooltip>
          )}
        </Space>
      )
    },
    {
      title: 'Qtd.', dataIndex: 'quantity', key: 'quantity', width: 150,
      render: (q, record) => (
        <Space>
          <Button size="small" icon={<MinusOutlined />} onClick={() => updateQuantity(record.id, -1)} />
          <Text strong style={{ minWidth: 20, textAlign: 'center' }}>{q}</Text>
          <Button size="small" icon={<PlusOutlined />} onClick={() => updateQuantity(record.id, 1)} />
        </Space>
      )
    },
    {
      title: 'Preço Unit.', dataIndex: 'price', key: 'price',
      render: p => `R$ ${(p || 0).toFixed(2).replace('.', ',')}`
    },
    {
      title: 'Total', key: 'total',
      render: (_, record) => <Text strong>R$ {((record.price || 0) * (record.quantity || 0)).toFixed(2).replace('.', ',')}</Text>
    },
    {
      key: 'action', width: 50, align: 'center',
      render: (_, record) => (
        <Tooltip title="Remover Item">
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeItem(record.id)} />
        </Tooltip>
      )
    }
  ];

  if (pageLoading) {
    return <Spin size="large" tip="Verificando status do caixa..." fullscreen />;
  }

  return (
    <>
      <PageStyles />
      <Layout className="pos-page-layout">
        <Header className="pos-header">
          <Text strong>Operador: {cashRegisterStatus?.user?.full_name || 'N/A'}</Text>
          <Title level={4} style={{ margin: 0 }}>FRENTE DE CAIXA</Title>
          <Text>{currentTime}</Text>
        </Header>
        <Layout className="pos-content-layout">
          <Content>
            <div className="pos-main-content">
              <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                <AutoComplete
                  options={autocompleteOptions}
                  style={{ width: '100%' }}
                  onSelect={onAutocompleteSelect}
                  onSearch={(text) => setSearchValue(text)}
                  onFocus={handleProductInputFocus}
                  value={searchValue}
                  allowClear
                  backfill
                >
                  <Input
                    className="search-input"
                    ref={searchInputRef}
                    placeholder="Leia o código de barras ou digite para buscar..."
                    size="large"
                    prefix={<BarcodeOutlined style={{ fontSize: 20, color: 'var(--primary-color)' }} />}
                    onPressEnter={handleExactSearch}
                    suffix={searchLoading ? <Spin size="small" /> : null}
                  />
                </AutoComplete>
              </motion.div>
              <Card className="clean-card cart-table-card">
                <Table
                  className="cart-table"
                  columns={cartColumns}
                  dataSource={cartItems}
                  rowKey="key"
                  pagination={false}
                  locale={{ emptyText: <Empty description="Nenhum item no carrinho." /> }}
                  rowClassName={(record) => record.id === lastAddedItem?.id ? 'highlight-new-item' : ''}
                  scroll={{ y: 'calc(100vh - 400px)' }}
                />
              </Card>
            </div>
          </Content>
          <Sider width={450} className="pos-sider">
            <div className='sider-container'>
              <Card bordered={false} bodyStyle={{padding: 0}}>
                 <Space.Compact style={{ width: '100%' }}>
                     <Select
                         ref={customerSelectRef}
                         showSearch
                         allowClear
                         placeholder="Associar cliente (Opcional)"
                         style={{ flex: 1 }}
                         value={selectedCustomer?.id}
                         onSearch={(value) => setCustomerSearchValue(value)}
                         onChange={handleSelectCustomer}
                         onClear={handleClearCustomer}
                         onDropdownVisibleChange={handleCustomerDropdownVisibleChange}
                         loading={customerLoading}
                         filterOption={false}
                         notFoundContent={customerLoading ? <Spin size="small" /> : 'Nenhum cliente encontrado.'}
                         options={customerOptions}
                         optionLabelProp="label"
                     />
                    <Button icon={<PlusOutlined />} onClick={() => setIsCustomerModalVisible(true)}>
                      Novo
                    </Button>
                 </Space.Compact>
              </Card>

              <Card bordered={false} bodyStyle={{padding: '16px 0'}}>
                <AnimatePresence mode="wait">
                  {lastAddedItem ? (
                    <motion.div key={lastAddedItem.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                      <Space direction="vertical" align="center" style={{ width: '100%' }}>
                        <Image width={120} height={120} src={lastAddedItem.image_url} preview={false} fallback="https://via.placeholder.com/120/ecf0f1/bdc3c7?text=Sem+Img" style={{borderRadius: 8, objectFit: 'cover'}} />
                        <Title level={5} style={{ textAlign: 'center', margin: '8px 0 0' }}>{lastAddedItem.name}</Title>
                        <Statistic value={lastAddedItem.price || 0} precision={2} prefix="R$" />
                      </Space>
                    </motion.div>
                  ) : (
                    <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Space direction="vertical" align="center" style={{ width: '100%', height: 213, justifyContent: 'center' }}>
                        <CameraOutlined style={{ fontSize: 48, color: '#bdc3c7' }}/>
                        <Text type="secondary">Aguardando produto...</Text>
                      </Space>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>

              <div className="payment-section">
                  <div className="total-display">
                      <Text className="total-label">VALOR TOTAL</Text>
                      <motion.div key={subtotal} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                          <Statistic value={subtotal} precision={2} prefix="R$" className="total-amount" />
                      </motion.div>
                      <Statistic title="Total de Itens" value={totalItems} />
                  </div>
                  <Divider style={{ margin: '16px 0' }}/>
                  <Space direction="vertical" style={{ width: '100%' }} size="middle" className="action-buttons">
                      <Button type="primary" size="large" icon={<DollarCircleOutlined />} block onClick={handleOpenPaymentModal} disabled={cartItems.length === 0}>
                          <span className="action-button-key">F6</span> FINALIZAR
                      </Button>
                      <Button danger size="large" icon={<CloseCircleOutlined />} block onClick={handleCancelSale} disabled={cartItems.length === 0}>
                          <span className="action-button-key">F3</span> CANCELAR
                      </Button>
                  </Space>
              </div>
            </div>
          </Sider>
        </Layout>
      </Layout>
      <PaymentModal
        open={isPaymentModalOpen}
        onCancel={() => setIsPaymentModalOpen(false)}
        onOk={handleSaleSuccess}
        cartItems={cartItems.map(item => ({
            product_id: item.id,
            quantity: item.quantity,
            price_at_sale: item.price
        }))}
        totalAmount={subtotal}
        customerId={selectedCustomer?.id}
      />
      <Modal
        title="Novo Cliente"
        open={isCustomerModalVisible}
        onCancel={() => setIsCustomerModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <CustomerForm
          form={customerForm}
          onFinish={handleCreateCustomer}
          onCancel={() => setIsCustomerModalVisible(false)}
        />
      </Modal>
    </>
  );
};

export default POSPage;