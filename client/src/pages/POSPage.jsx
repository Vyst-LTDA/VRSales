// client/src/pages/POSPage.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Layout, Input, Table, Avatar, Typography, Button, Space,
  Divider, message, Modal, Image, Spin, Empty, AutoComplete,
  Select, Badge, Form, Tag, List, Card, Tooltip
} from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingOutlined, PlusOutlined, MinusOutlined, DeleteOutlined,
  CloseCircleOutlined, UserOutlined, WarningOutlined, StarFilled,
  MailOutlined, PhoneOutlined, ScanOutlined, CheckCircleFilled,
  SyncOutlined, SaveOutlined, ThunderboltFilled, PauseCircleOutlined,
  PlayCircleOutlined, QuestionCircleOutlined
} from '@ant-design/icons';
import ApiService from '../api/ApiService';
import PaymentModal from '../components/PaymentModal';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDebounce } from '../hooks/useDebounce';

const { Title, Text } = Typography;

const POSStyles = () => (
  <style>{`
    .pos-wrapper {
      padding: 16px;
      background-color: #f4f5f7;
      min-height: calc(100vh - 64px);
    }
    .pos-container {
      height: calc(100vh - 96px);
      display: flex;
      gap: 24px;
      overflow: hidden;
      font-family: 'Inter', sans-serif;
    }
    .pos-left-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: white;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    .search-wrapper .ant-input-affix-wrapper {
      padding: 12px 16px;
      border-radius: 12px;
      border: 2px solid #eef2f5;
      background: #f9fafb;
      transition: all 0.3s;
    }
    .search-wrapper .ant-input-affix-wrapper:focus-within {
      border-color: #0052CC;
      background: white;
      box-shadow: 0 0 0 4px rgba(0, 82, 204, 0.1);
    }
    .search-wrapper input {
      font-size: 16px;
    }
    .custom-cart-table .ant-table-thead > tr > th {
      background: #f4f5f7;
      color: #5e6c84;
      font-weight: 600;
      border-bottom: none;
      border-radius: 8px 8px 0 0;
    }
    .custom-cart-table .ant-table-tbody > tr > td {
      border-bottom: 1px solid #f0f0f0;
      padding: 16px;
    }
    .custom-cart-table .ant-table-tbody > tr:last-child > td {
      border-bottom: none;
    }
    @keyframes flash-green {
      0% { background-color: rgba(54, 179, 126, 0.2); }
      100% { background-color: transparent; }
    }
    .row-highlight-new {
      animation: flash-green 1s ease-out;
    }
    .pos-right-panel {
      width: 420px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .info-card {
      background: white;
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      border: 1px solid #eef2f5;
    }
    .totals-container {
      margin-top: auto;
      background: linear-gradient(135deg, #091E42 0%, #172B4D 100%);
      color: white;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 8px 24px rgba(9, 30, 66, 0.25);
    }
    .totals-container .ant-typography {
      color: rgba(255,255,255,0.8);
    }
    .totals-container .amount-display {
      font-size: 52px;
      font-weight: 800;
      color: #ffffff;
      line-height: 1;
      margin: 8px 0 24px 0;
      letter-spacing: -1.5px;
    }
    .action-btn-lg {
      height: 56px;
      font-size: 16px;
      font-weight: 700;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border: none;
    }
    .action-btn-lg.btn-success {
      background: #36B37E;
      color: white;
    }
    .action-btn-lg.btn-success:hover {
      background: #2D9A6C;
    }
    .action-btn-lg.btn-warning {
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .action-btn-lg.btn-warning:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    .action-btn-lg.btn-danger {
      background: rgba(255, 77, 79, 0.1);
      color: #ff4d4f;
    }
    .action-btn-lg.btn-danger:hover {
      background: rgba(255, 77, 79, 0.2);
    }
    .key-badge {
      background: rgba(255,255,255,0.25);
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 12px;
      margin-right: 6px;
      font-weight: 600;
    }
    .key-badge-dark {
      background: rgba(0, 0, 0, 0.1);
      color: inherit;
    }
    .product-option-item {
      padding: 8px 0;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .product-option-item img {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      object-fit: cover;
    }
    .multiplier-btn {
      border-color: #eef2f5;
      color: #5e6c84;
      font-weight: 600;
      background: #f9fafb;
      border-radius: 8px;
      transition: all 0.2s;
    }
    .multiplier-btn:hover {
      border-color: #0052CC;
      color: #0052CC;
      background: #ebf3ff;
      transform: translateY(-1px);
    }
    .shortcut-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #f0f0f0;
      font-size: 15px;
    }
    .shortcut-row:last-child {
      border-bottom: none;
    }
  `}</style>
);

const CustomerForm = ({ form, onFinish, onCancel }) => (
  <Form form={form} layout="vertical" onFinish={onFinish}>
    <Form.Item name="full_name" label="Nome Completo" rules={[{ required: true, message: 'Obrigatório' }]}>
      <Input prefix={<UserOutlined />} placeholder="Ex: João da Silva" size="large" />
    </Form.Item>
    <Form.Item name="email" label="E-mail" rules={[{ type: 'email', message: 'E-mail inválido' }]}>
      <Input prefix={<MailOutlined />} placeholder="Ex: joao@email.com" size="large" />
    </Form.Item>
    <Form.Item name="phone_number" label="Telefone">
      <Input prefix={<PhoneOutlined />} placeholder="(16) 99999-8888" size="large" />
    </Form.Item>
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
      <Button onClick={onCancel} size="large">Cancelar</Button>
      <Button type="primary" htmlType="submit" size="large">Salvar</Button>
    </div>
  </Form>
);

const POSPage = () => {
  const [cashRegisterStatus, setCashRegisterStatus] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const [activeOrderId, setActiveOrderId] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const [cartItems, setCartItems] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [isHelpModalVisible, setIsHelpModalVisible] = useState(false);
  const [isHeldOrdersModalVisible, setIsHeldOrdersModalVisible] = useState(false);
  const [heldOrders, setHeldOrders] = useState([]);

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
  const debouncedSearchValue = useDebounce(searchValue, 300);
  const debouncedCustomerSearch = useDebounce(customerSearchValue, 300);

  const mapOrderItemsToTable = (items) => {
    return items.map(item => ({
      ...item.product,
      id: item.product_id,
      orderItemId: item.id,
      quantity: item.quantity,
      price: item.price_at_order || item.price_at_addition || item.product?.price || 0,
      key: item.product_id
    }));
  };

  const playSuccessSound = () => { 
    const audio = new Audio("https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3"); 
    audio.volume = 0.5; 
    audio.play().catch(()=>{}); 
  };
  
  const playErrorSound = () => { 
    const audio = new Audio("https://codeskulptor-demos.commondatastorage.googleapis.com/assets/soundboard/explode.mp3"); 
    audio.volume = 0.3; 
    audio.play().catch(()=>{}); 
  };

  useEffect(() => {
    const initializePOS = async () => {
      try {
        const status = await ApiService.getCashRegisterStatus();
        setCashRegisterStatus(status.data);
        try {
          const activeOrder = await ApiService.getActivePosOrder();
          if (activeOrder.data) {
            setActiveOrderId(activeOrder.data.id);
            setCartItems(mapOrderItemsToTable(activeOrder.data.items || []));
            if (activeOrder.data.customer) setSelectedCustomer(activeOrder.data.customer);
            message.success({ content: 'Venda anterior recuperada!', key: 'restore', duration: 3 });
          }
        } catch (err) {}
      } catch (error) {
        if (error.response?.status === 404) {
          message.warning('Caixa fechado. Redirecionando...');
          navigate('/open-cash-register');
        }
      } finally {
        setPageLoading(false);
        setTimeout(() => searchInputRef.current?.focus(), 500);
      }
    };
    initializePOS();
  }, [navigate]);

  const fetchProducts = useCallback(async (term = '') => {
    if (/^\d+\*$/.test(term)) return;
    setSearchLoading(true);
    try {
      const cleanTerm = term.replace(/^\d+[\*x]/i, '');
      const res = await ApiService.lookupProduct(cleanTerm);
      const options = (res.data || []).map(p => ({
        value: p.name, 
        key: p.id, 
        productData: p,
        label: (
          <div className="product-option-item">
            <img src={p.image_url || 'https://via.placeholder.com/48'} alt={p.name} />
            <div style={{ flex: 1 }}>
              <Text strong style={{ fontSize: 15 }}>{p.name}</Text>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>COD: {p.barcode || p.id}</Text>
                <Text type="success" strong>R$ {p.price.toFixed(2)}</Text>
              </div>
            </div>
          </div>
        )
      }));
      setAutocompleteOptions(options);
    } catch { 
      message.error('Erro ao buscar produtos'); 
    } finally { 
      setSearchLoading(false); 
    }
  }, []);

  useEffect(() => {
    if (debouncedSearchValue.length >= 2) fetchProducts(debouncedSearchValue);
    else if (!debouncedSearchValue) setAutocompleteOptions([]);
  }, [debouncedSearchValue, fetchProducts]);

  const handleQuickMultiplier = (n) => { 
    setSearchValue(`${n}*`); 
    searchInputRef.current?.focus(); 
  };

  const addProductToCart = async (product, quantityOverride = 1) => {
    const existing = cartItems.find(i => i.id === product.id);
    if (product.stock <= (existing ? existing.quantity : 0) + quantityOverride - 1) { 
       message.warning({ content: `Estoque de "${product.name}" zerado ou negativo.`, icon: <WarningOutlined style={{color: '#faad14'}}/> }, 3);
    }

    setIsSyncing(true);
    try {
        let response;
        if (!activeOrderId) {
            const newOrderData = {
                order_type: 'TAKEOUT', 
                customer_id: selectedCustomer?.id || null,
                items: [{ product_id: product.id, quantity: quantityOverride }]
            };
            response = await ApiService.createOrder(newOrderData);
            setActiveOrderId(response.data.id);
        } else {
            response = await ApiService.addItemToOrder(activeOrderId, { product_id: product.id, quantity: quantityOverride });
        }

        if (response.data && response.data.items) {
            const freshItems = mapOrderItemsToTable(response.data.items);
            setCartItems(freshItems);
            const addedItem = freshItems.find(i => i.id === product.id);
            if (addedItem) setLastAddedItem(addedItem);
            message.success(`${product.name} adicionado!`);
        }
        setSearchValue('');
        setAutocompleteOptions([]);
        setTimeout(() => searchInputRef.current?.focus(), 100);
    } catch (error) { 
      console.error(error); 
      message.error("Erro ao adicionar item."); 
    } finally { 
      setIsSyncing(false); 
    }
  };

  const updateQty = async (product, delta) => {
    if (!activeOrderId || !product.orderItemId) return;
    setIsSyncing(true);
    try {
        let response;
        const newQty = product.quantity + delta;
        if (newQty <= 0) {
            response = await ApiService.removeOrderItem(activeOrderId, product.orderItemId);
            message.info('Item removido.');
        } else {
            response = await ApiService.updateOrderItem(activeOrderId, product.orderItemId, newQty);
        }
        if (response.data && response.data.items) setCartItems(mapOrderItemsToTable(response.data.items));
    } catch (error) { 
      message.error("Erro ao atualizar quantidade."); 
    } finally { 
      setIsSyncing(false); 
    }
  };

  const handleExactSearch = async () => {
    if (!searchValue) return;
    setSearchLoading(true);
    let qtyMultiplier = 1;
    let termToSearch = searchValue;
    const match = searchValue.match(/^(\d+)[x\*](.+)$/i);
    
    if (match) { 
      qtyMultiplier = parseInt(match[1], 10); 
      termToSearch = match[2].trim(); 
    }

    try {
      const res = await ApiService.lookupProduct(termToSearch);
      if (res.data.length > 0) {
        const exactBarcodeMatch = res.data.find(p => p.barcode === termToSearch);
        const exactNameMatch = res.data.find(p => p.name.toLowerCase() === termToSearch.toLowerCase());
        const productToAdd = exactBarcodeMatch || exactNameMatch || res.data[0];
        await addProductToCart(productToAdd, qtyMultiplier);
        playSuccessSound();
      } else {
        playErrorSound();
        message.warning('Produto não encontrado');
        setSearchValue('');
      }
    } catch { 
      playErrorSound(); 
      message.error('Erro na busca'); 
    } finally { 
      setSearchLoading(false); 
      setTimeout(() => searchInputRef.current?.focus(), 100); 
    }
  };

  const fetchCustomers = useCallback(async (term = '') => {
    setCustomerLoading(true);
    try {
      const res = await ApiService.get('/customers/'); 
      const filtered = (res.data || []).filter(c => !term || c.full_name.toLowerCase().includes(term.toLowerCase()));
      const opts = filtered.map(c => ({ value: c.id, label: c.full_name, customerData: c }));
      setCustomerOptions(opts);
    } catch { 
      message.error('Erro ao buscar clientes'); 
    } finally { 
      setCustomerLoading(false); 
    }
  }, []);

  useEffect(() => {
    if (debouncedCustomerSearch.length >= 2) fetchCustomers(debouncedCustomerSearch);
  }, [debouncedCustomerSearch, fetchCustomers]);

  const handleCreateCustomer = async (values) => {
    try {
      const res = await ApiService.post('/customers/', values);
      message.success('Cliente cadastrado!');
      setIsCustomerModalVisible(false);
      setSelectedCustomer(res.data);
      customerForm.resetFields();
    } catch (err) { 
      message.error('Erro ao criar cliente'); 
    }
  };

  const handleRequestCancel = useCallback(() => { 
    if (activeOrderId) setIsCancelModalVisible(true); 
  }, [activeOrderId]);

  const confirmCancelSale = async () => {
    setIsSyncing(true);
    try {
        await ApiService.cancelOrder(activeOrderId);
        setCartItems([]); 
        setLastAddedItem(null); 
        setSelectedCustomer(null); 
        setActiveOrderId(null);
        setIsCancelModalVisible(false);
        message.success('Venda cancelada.');
        searchInputRef.current?.focus();
    } catch (err) { 
      message.error("Erro ao cancelar venda."); 
    } finally { 
      setIsSyncing(false); 
    }
  };

  const handleOpenPaymentModal = useCallback(() => {
      if (cartItems.length > 0) setIsPaymentModalOpen(true);
      else message.warning('O carrinho está vazio.');
  }, [cartItems]);

  const handleSaleSuccess = () => {
    setIsPaymentModalOpen(false); 
    setCartItems([]); 
    setLastAddedItem(null); 
    setSelectedCustomer(null); 
    setActiveOrderId(null);
    message.success('Venda concluída com sucesso!'); 
    searchInputRef.current?.focus();
  };

  const handleHoldOrder = async () => {
    if (!activeOrderId) { 
      message.warning('Nenhuma venda em andamento para colocar em espera.'); 
      return; 
    }
    setIsSyncing(true);
    try {
        await ApiService.holdOrder(activeOrderId);
        setCartItems([]); 
        setLastAddedItem(null); 
        setSelectedCustomer(null); 
        setActiveOrderId(null);
        message.success('Venda colocada em espera!');
        searchInputRef.current?.focus();
    } catch (error) { 
      message.error('Erro ao colocar venda em espera.'); 
    } finally { 
      setIsSyncing(false); 
    }
  };

  const fetchHeldOrders = async () => {
      try {
          const res = await ApiService.getHeldOrders();
          setHeldOrders(res.data);
          setIsHeldOrdersModalVisible(true);
      } catch (error) { 
        message.error('Erro ao buscar vendas em espera.'); 
      }
  };

  const handleResumeOrder = async (orderId) => {
      if (activeOrderId) { 
        message.warning('Finalize ou coloque em espera a venda atual antes de retomar outra.'); 
        return; 
      }
      try {
          const res = await ApiService.resumeOrder(orderId);
          setActiveOrderId(res.data.id);
          setCartItems(mapOrderItemsToTable(res.data.items || []));
          if (res.data.customer) setSelectedCustomer(res.data.customer);
          setIsHeldOrdersModalVisible(false);
          message.success('Venda retomada com sucesso!');
          searchInputRef.current?.focus();
      } catch (error) { 
        message.error('Erro ao retomar venda.'); 
      }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F6') { e.preventDefault(); handleOpenPaymentModal(); }
      if (e.key === 'F3') { e.preventDefault(); if (activeOrderId) handleRequestCancel(); }
      if (e.key === 'F4') { e.preventDefault(); handleHoldOrder(); }
      if (e.key === 'F1') { e.preventDefault(); setIsHelpModalVisible(true); }
      if (e.key === 'F2') { e.preventDefault(); searchInputRef.current?.focus(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleOpenPaymentModal, handleRequestCancel, activeOrderId]);

  const { subtotal, itemCount } = useMemo(() => ({
    subtotal: cartItems.reduce((acc, i) => acc + (i.price * i.quantity), 0),
    itemCount: cartItems.reduce((acc, i) => acc + i.quantity, 0)
  }), [cartItems]);

  const columns = [
    { 
      title: 'Produto', 
      dataIndex: 'name', 
      key: 'name', 
      render: (name, r) => (
        <Space size="middle">
          <Avatar 
            shape="square" 
            size="large" 
            src={r.image_url} 
            icon={<ShoppingOutlined />} 
            style={{ backgroundColor: '#f0f2f5', borderRadius: 8 }} 
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Text strong style={{ fontSize: 15 }}>{name}</Text>
            {r.stock <= 0 ? (
              <Tag color="error" style={{ width: 'fit-content', marginTop: 4 }}>Sem Estoque</Tag>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>R$ {r.price.toFixed(2)} / un</Text>
            )}
          </div>
        </Space>
      ) 
    },
    { 
      title: 'Qtd', 
      key: 'qty', 
      width: 140, 
      align: 'center', 
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: 8, padding: '4px 8px' }}>
          <Button type="text" size="small" icon={<MinusOutlined />} onClick={() => updateQty(r, -1)} loading={isSyncing} />
          <Text strong style={{ margin: '0 12px', width: 24, textAlign: 'center', fontSize: 16 }}>{r.quantity}</Text>
          <Button type="text" size="small" icon={<PlusOutlined />} onClick={() => updateQty(r, 1)} loading={isSyncing} />
        </div>
      ) 
    },
    { 
      title: 'Total', 
      key: 'total', 
      align: 'right', 
      width: 120,
      render: (_, r) => <Text strong style={{ fontSize: 16 }}>R$ {(r.price * r.quantity).toFixed(2)}</Text> 
    },
    { 
      key: 'act', 
      width: 60, 
      align: 'center',
      render: (_, r) => (
        <Tooltip title="Remover item">
          <Button type="text" danger icon={<DeleteOutlined style={{ fontSize: 16 }}/>} onClick={() => updateQty(r, -9999)} />
        </Tooltip>
      ) 
    }
  ];

  if (pageLoading) return <Spin size="large" fullscreen tip="Carregando Frente de Caixa..." />;

  return (
    <div className="pos-wrapper">
      <POSStyles />
      <div className="pos-container">
        
        {/* Painel Esquerdo: Produtos e Carrinho */}
        <div className="pos-left-panel">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
             {[2, 3, 4, 5, 6, 10, 12].map(n => (
                 <Button key={n} size="middle" onClick={() => handleQuickMultiplier(n)} className="multiplier-btn" icon={<ThunderboltFilled style={{fontSize: 12}} />}>
                   +{n}
                 </Button>
             ))}
             <Button size="middle" icon={<QuestionCircleOutlined />} onClick={() => setIsHelpModalVisible(true)} style={{marginLeft: 'auto', borderRadius: 8}}>
               Ajuda (F1)
             </Button>
          </div>

          <div className="search-wrapper">
            <AutoComplete 
  options={autocompleteOptions} 
  style={{ width: '100%' }} 
  onSelect={(_, opt) => {
    let qtyMultiplier = 1;
    // Verifica se existe um multiplicador no início da busca (ex: "5*", "12x")
    const match = searchValue.match(/^(\d+)[x\*]/i);
    if (match) {
      qtyMultiplier = parseInt(match[1], 10);
    }
    addProductToCart(opt.productData, qtyMultiplier);
  }} 
  onSearch={setSearchValue} 
  value={searchValue} 
  backfill
>
              <Input 
                ref={searchInputRef} 
                size="large" 
                placeholder="Escaneie o código ou busque por nome (F2 para focar)..." 
                prefix={<ScanOutlined style={{ fontSize: 22, color: '#0052CC', marginRight: 12 }} />} 
                onPressEnter={handleExactSearch} 
                suffix={
                  isSyncing ? <SyncOutlined spin style={{color:'#0052CC', fontSize: 18}} /> 
                  : (searchLoading ? <Spin size="small"/> 
                  : <div style={{ fontSize: 12, color: '#999', border: '1px solid #ddd', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>ENTER</div>)
                } 
              />
            </AutoComplete>
          </div>

          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Table 
              className="custom-cart-table" 
              columns={columns} 
              dataSource={cartItems} 
              rowKey="key" 
              pagination={false} 
              scroll={{ y: 'calc(100vh - 350px)' }} 
              rowClassName={(r) => r.id === lastAddedItem?.id ? 'row-highlight-new' : ''} 
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Caixa livre. Inicie uma venda adicionando produtos." /> }} 
            />
          </div>
        </div>

        {/* Painel Direito: Cliente, Último Item e Totais */}
        <div className="pos-right-panel">
          {activeOrderId && (
            <div style={{ background: '#E3FCEF', padding: '12px 16px', borderRadius: 12, color: '#006644', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
              <SaveOutlined /> Venda #{activeOrderId} em andamento
            </div>
          )}
          
          <div className="info-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text type="secondary" strong style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>Cliente</Text>
                <div style={{display:'flex', gap: 12}}>
                    <Button type="link" size="small" style={{ padding: 0, fontWeight: 600 }} onClick={fetchHeldOrders}>Recuperar (F4)</Button>
                    {!selectedCustomer && (
                      <Button type="link" size="small" style={{ padding: 0, fontWeight: 600 }} onClick={() => setIsCustomerModalVisible(true)}>+ Novo Cliente</Button>
                    )}
                </div>
            </div>
            {selectedCustomer ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F4F5F7', padding: '12px 16px', borderRadius: 12 }}>
                <Space size="middle">
                  <Avatar size="large" style={{ backgroundColor: '#0052CC', fontWeight: 'bold' }}>
                    {selectedCustomer.full_name[0].toUpperCase()}
                  </Avatar>
                  <div>
                    <Text strong style={{ fontSize: 15, display: 'block' }}>{selectedCustomer.full_name}</Text>
                    {selectedCustomer.loyalty_points > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: '#faad14', marginTop: 4 }}>
                        <StarFilled style={{ marginRight: 4 }} /> {selectedCustomer.loyalty_points} pts
                      </div>
                    )}
                  </div>
                </Space>
                <Tooltip title="Remover cliente da venda">
                  <Button type="text" icon={<CloseCircleOutlined style={{ fontSize: 18, color: '#ff4d4f' }} />} onClick={() => setSelectedCustomer(null)} />
                </Tooltip>
              </div>
            ) : (
              <Select 
                showSearch 
                placeholder="Selecionar Cliente (Opcional)" 
                style={{ width: '100%' }} 
                size="large" 
                onSearch={setCustomerSearchValue} 
                onFocus={() => fetchCustomers('')} 
                filterOption={false} 
                options={customerOptions} 
                onChange={(_, opt) => { setSelectedCustomer(opt.customerData); setCustomerOptions([]); }} 
                notFoundContent={customerLoading ? <Spin size="small" /> : null} 
              />
            )}
          </div>

          <div className="info-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 220 }}>
            <AnimatePresence mode="wait">
              {lastAddedItem ? (
                <motion.div 
                  key={lastAddedItem.id} 
                  initial={{ scale: 0.8, opacity: 0 }} 
                  animate={{ scale: 1, opacity: 1 }} 
                  exit={{ opacity: 0 }} 
                  style={{ textAlign: 'center', width: '100%' }}
                >
                  <Badge count={lastAddedItem.quantity > 1 ? `x${cartItems.find(i=>i.id===lastAddedItem.id)?.quantity}` : 0} color="#0052CC" offset={[-10, 10]}>
                    <Image 
                      src={lastAddedItem.image_url} 
                      width={140} 
                      height={140} 
                      style={{ objectFit: 'cover', borderRadius: 16, border: '4px solid #f4f5f7' }} 
                      preview={false} 
                      fallback="https://via.placeholder.com/150?text=Sem+Foto" 
                    />
                  </Badge>
                  <Title level={4} style={{ marginTop: 16, marginBottom: 4 }}>{lastAddedItem.name}</Title>
                  <Text type="secondary" style={{ fontSize: 16 }}>R$ {lastAddedItem.price.toFixed(2)} / un</Text>
                  <div style={{ marginTop: 16, color: '#36B37E', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 14, fontWeight: 600 }}>
                    <CheckCircleFilled /> Adicionado com sucesso
                  </div>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', color: '#ccc' }}>
                  <ShoppingOutlined style={{ fontSize: 72, marginBottom: 16, opacity: 0.5 }} />
                  <p style={{ fontSize: 16, fontWeight: 500 }}>Aguardando produtos...</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="totals-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 16 }}>Quantidade de Itens:</Text>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>{itemCount}</Text>
            </div>
            {isSyncing && (
              <div style={{ textAlign: 'right', marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: '#36B37E' }}><SyncOutlined spin/> Salvando alterações...</Text>
              </div>
            )}
            
            <Divider style={{ borderColor: 'rgba(255,255,255,0.15)', margin: '16px 0' }} />
            
            <Text style={{ fontSize: 14, letterSpacing: 1 }}>TOTAL A PAGAR</Text>
            <div className="amount-display">R$ {subtotal.toFixed(2)}</div>
            
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              <Button 
                className="action-btn-lg btn-success" 
                block 
                disabled={!activeOrderId && cartItems.length === 0} 
                onClick={handleOpenPaymentModal}
              >
                <span className="key-badge">F6</span> FINALIZAR VENDA
              </Button>
              
              <div style={{ display: 'flex', gap: 16 }}>
                  <Button 
                    className="action-btn-lg btn-warning" 
                    style={{ flex: 1 }} 
                    onClick={handleHoldOrder} 
                    disabled={!activeOrderId}
                  >
                    <span className="key-badge key-badge-dark">F4</span> ESPERA
                  </Button>
                  <Button 
                    className="action-btn-lg btn-danger" 
                    style={{ flex: 1 }} 
                    disabled={!activeOrderId} 
                    onClick={handleRequestCancel}
                  >
                    <span className="key-badge key-badge-dark">F3</span> CANCELAR
                  </Button>
              </div>
            </Space>
          </div>
        </div>
      </div>

      <PaymentModal 
        open={isPaymentModalOpen} 
        onCancel={() => setIsPaymentModalOpen(false)} 
        onOk={handleSaleSuccess} 
        cartItems={cartItems.map(i => ({ product_id: i.id, quantity: i.quantity, price_at_sale: i.price }))} 
        totalAmount={subtotal} 
        customerId={selectedCustomer?.id} 
        orderId={activeOrderId} 
      />
      
      <Modal 
        title={<Title level={4} style={{ margin: 0 }}>Novo Cliente</Title>} 
        open={isCustomerModalVisible} 
        onCancel={() => setIsCustomerModalVisible(false)} 
        footer={null} 
        destroyOnClose
      >
        <div style={{ marginTop: 24 }}>
          <CustomerForm form={customerForm} onFinish={handleCreateCustomer} onCancel={() => setIsCustomerModalVisible(false)} />
        </div>
      </Modal>
      
      <Modal 
        title={<span style={{color: '#ff4d4f', display: 'flex', alignItems: 'center', gap: 8, fontSize: 18}}><WarningOutlined /> Cancelar Venda?</span>} 
        open={isCancelModalVisible} 
        onOk={confirmCancelSale} 
        onCancel={() => setIsCancelModalVisible(false)} 
        okText="Sim, Cancelar Venda" 
        cancelText="Voltar" 
        okButtonProps={{ danger: true, size: 'large', loading: isSyncing }}
        cancelButtonProps={{ size: 'large' }}
      >
        <p style={{ fontSize: 16, marginTop: 16 }}>Tem certeza que deseja cancelar a venda atual? Todos os itens serão removidos e a operação não poderá ser desfeita.</p>
      </Modal>
      
      <Modal 
        title={<Title level={4} style={{ margin: 0 }}>Atalhos do Sistema</Title>} 
        open={isHelpModalVisible} 
        onCancel={() => setIsHelpModalVisible(false)} 
        footer={null}
      >
        <div style={{ marginTop: 24 }}>
          <div className="shortcut-row"><Text strong>F1</Text><Text>Ajuda / Atalhos</Text></div>
          <div className="shortcut-row"><Text strong>F2</Text><Text>Focar na busca de produtos</Text></div>
          <div className="shortcut-row"><Text strong>F3</Text><Text>Cancelar venda atual</Text></div>
          <div className="shortcut-row"><Text strong>F4</Text><Text>Colocar venda em espera / Recuperar</Text></div>
          <div className="shortcut-row"><Text strong>F6</Text><Text>Finalizar venda / Confirmar pagamento</Text></div>
          <div className="shortcut-row"><Text strong>N*Código</Text><Text>Multiplica quantidade (Ex: 10*789...)</Text></div>
        </div>
      </Modal>

      <Modal 
        title={<Title level={4} style={{ margin: 0 }}>Vendas em Espera</Title>} 
        open={isHeldOrdersModalVisible} 
        onCancel={() => setIsHeldOrdersModalVisible(false)} 
        footer={null}
        width={600}
      >
          <List
            style={{ marginTop: 16 }}
            itemLayout="horizontal"
            dataSource={heldOrders}
            renderItem={(item) => (
              <List.Item 
                actions={[<Button type="primary" size="large" onClick={() => handleResumeOrder(item.id)} icon={<PlayCircleOutlined />}>Retomar</Button>]}
                style={{ background: '#fafafa', padding: '16px', borderRadius: 8, marginBottom: 8, border: '1px solid #f0f0f0' }}
              >
                <List.Item.Meta
                  avatar={<Avatar size="large" icon={<PauseCircleOutlined />} style={{ backgroundColor: '#faad14' }} />}
                  title={<Text strong style={{ fontSize: 16 }}>Venda #{item.id}</Text>}
                  description={
                    <div style={{ marginTop: 4 }}>
                      <Tag color="blue">{item.items?.length || 0} itens</Tag> 
                      <Text type="secondary" style={{ marginRight: 8 }}>• {item.customer ? item.customer.full_name : 'Consumidor Final'}</Text> 
                      <Text type="secondary">• {new Date(item.created_at).toLocaleTimeString()}</Text>
                    </div>
                  }
                />
              </List.Item>
            )}
            locale={{ emptyText: <Empty description="Nenhuma venda em espera no momento." /> }}
          />
      </Modal>
    </div>
  );
};

export default POSPage;