// client/src/pages/POSPage.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Layout, Input, Table, Avatar, Typography, Button, Space,
  Divider, message, Modal, Image, Spin, Empty, AutoComplete,
  Select, Badge, Form, Tag
} from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingOutlined, PlusOutlined, MinusOutlined, DeleteOutlined,
  CloseCircleOutlined, UserOutlined, WarningOutlined, StarFilled,
  MailOutlined, PhoneOutlined, ScanOutlined, CheckCircleFilled,
  SyncOutlined, SaveOutlined, ThunderboltFilled
} from '@ant-design/icons';
import ApiService from '../api/ApiService';
import PaymentModal from '../components/PaymentModal';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDebounce } from '../hooks/useDebounce';

const { Title, Text } = Typography;

// --- ESTILOS (Mantidos) ---
const POSStyles = () => (
  <style>{`
    .pos-container { height: calc(100vh - 84px); display: flex; gap: 24px; overflow: hidden; font-family: 'Inter', sans-serif; }
    .pos-left-panel { flex: 1; display: flex; flex-direction: column; gap: 16px; background: white; border-radius: 16px; padding: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
    .search-wrapper .ant-input-affix-wrapper { padding: 12px 16px; border-radius: 12px; border: 2px solid #eef2f5; background: #f9fafb; transition: all 0.3s; }
    .search-wrapper .ant-input-affix-wrapper:focus-within { border-color: #0052CC; background: white; box-shadow: 0 0 0 4px rgba(0, 82, 204, 0.1); }
    .search-wrapper input { font-size: 16px; }
    .custom-cart-table .ant-table-thead > tr > th { background: #f4f5f7; color: #5e6c84; font-weight: 600; border-bottom: none; }
    .custom-cart-table .ant-table-tbody > tr > td { border-bottom: 1px solid #f0f0f0; padding: 12px 16px; }
    .custom-cart-table .ant-table-tbody > tr:last-child > td { border-bottom: none; }
    @keyframes flash-green { 0% { background-color: rgba(54, 179, 126, 0.2); } 100% { background-color: transparent; } }
    .row-highlight-new { animation: flash-green 1s ease-out; }
    .pos-right-panel { width: 400px; display: flex; flex-direction: column; gap: 16px; }
    .info-card { background: white; border-radius: 16px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
    .totals-container { margin-top: auto; background: #091E42; color: white; border-radius: 16px; padding: 24px; box-shadow: 0 8px 24px rgba(9, 30, 66, 0.25); }
    .totals-container .ant-typography { color: rgba(255,255,255,0.7); }
    .totals-container .amount-display { font-size: 48px; font-weight: 800; color: #ffffff; line-height: 1; margin: 8px 0 24px 0; letter-spacing: -1px; }
    .action-btn-lg { height: 56px; font-size: 16px; font-weight: 700; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .key-badge { background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 6px; font-size: 12px; }
    .product-option-item { padding: 8px 0; display: flex; align-items: center; gap: 12px; }
    .product-option-item img { width: 40px; height: 40px; border-radius: 6px; object-fit: cover; }
    
    /* Estilo dos Botões Multiplicadores */
    .multiplier-btn {
        border-color: #eef2f5;
        color: #5e6c84;
        font-weight: 600;
        background: #f9fafb;
        transition: all 0.2s;
    }
    .multiplier-btn:hover {
        border-color: #0052CC;
        color: #0052CC;
        background: #ebf3ff;
    }
  `}</style>
);

const CustomerForm = ({ form, onFinish, onCancel }) => {
  return (
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
};

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
  
  // Modal de Cancelamento
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);

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

  // --- SONS ---
  const playSuccessSound = () => {
    const audio = new Audio("https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3"); 
    audio.volume = 0.5;
    audio.play().catch(e => console.log("Audio play failed", e));
  };

  const playErrorSound = () => {
    const audio = new Audio("https://codeskulptor-demos.commondatastorage.googleapis.com/assets/soundboard/explode.mp3");
    audio.volume = 0.3;
    audio.play().catch(e => console.log("Audio play failed", e));
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
    // Se o termo começar com "N*", ignora a busca até ter algo depois do asterisco
    if (/^\d+\*$/.test(term)) return;

    setSearchLoading(true);
    try {
      // Remove o multiplicador da busca se existir (ex: "2*coca" -> busca só "coca")
      const cleanTerm = term.replace(/^\d+[\*x]/i, '');
      
      const res = await ApiService.lookupProduct(cleanTerm);
      const options = (res.data || []).map(p => ({
        value: p.name, key: p.id, productData: p,
        label: (
          <div className="product-option-item">
            <img src={p.image_url || 'https://via.placeholder.com/40'} alt="" />
            <div style={{ flex: 1 }}>
              <Text strong>{p.name}</Text>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>COD: {p.barcode || p.id}</Text>
                <Text type="success" strong>R$ {p.price.toFixed(2)}</Text>
              </div>
            </div>
          </div>
        )
      }));
      setAutocompleteOptions(options);
    } catch { message.error('Erro ao buscar produtos'); }
    finally { setSearchLoading(false); }
  }, []);

  useEffect(() => {
    if (debouncedSearchValue.length >= 2) fetchProducts(debouncedSearchValue);
    else if (!debouncedSearchValue) setAutocompleteOptions([]);
  }, [debouncedSearchValue, fetchProducts]);

  // --- FUNÇÃO PARA BOTÕES DE MULTIPLICADOR ---
  const handleQuickMultiplier = (n) => {
    setSearchValue(`${n}*`);
    searchInputRef.current?.focus();
  };

  const addProductToCart = async (product, quantityOverride = 1) => {
    const existing = cartItems.find(i => i.id === product.id);
    if (product.stock <= (existing ? existing.quantity : 0) + quantityOverride - 1) { 
       // Warning silencioso ou visual poderia ser aqui
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
        response = await ApiService.addItemToOrder(activeOrderId, { 
          product_id: product.id, 
          quantity: quantityOverride 
        });
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

      if (response.data && response.data.items) {
        setCartItems(mapOrderItemsToTable(response.data.items));
      }

    } catch (error) {
      message.error("Erro ao atualizar quantidade.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExactSearch = async () => {
    if (!searchValue) return;
    setSearchLoading(true);

    // Lógica do Multiplicador (Ex: "10*123456")
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

  // ... (Clientes - Sem alteração)
  const fetchCustomers = useCallback(async (term = '') => {
    setCustomerLoading(true);
    try {
      const res = await ApiService.get('/customers/'); 
      const filtered = (res.data || []).filter(c => !term || c.full_name.toLowerCase().includes(term.toLowerCase()));
      const opts = filtered.map(c => ({ value: c.id, label: c.full_name, customerData: c }));
      setCustomerOptions(opts);
    } catch { message.error('Erro ao buscar clientes'); } 
    finally { setCustomerLoading(false); }
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
    } catch (err) { message.error('Erro ao criar cliente'); }
  };

  const handleRequestCancel = useCallback(() => {
    if (activeOrderId) {
      setIsCancelModalVisible(true);
    }
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
      else message.warning('Carrinho vazio.');
  }, [cartItems]);

  const handleSaleSuccess = () => {
    setIsPaymentModalOpen(false);
    setCartItems([]);
    setLastAddedItem(null);
    setSelectedCustomer(null);
    setActiveOrderId(null);
    message.success('Venda realizada!');
    searchInputRef.current?.focus();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F6') { e.preventDefault(); handleOpenPaymentModal(); }
      if (e.key === 'F3') { e.preventDefault(); if (activeOrderId) handleRequestCancel(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleOpenPaymentModal, handleRequestCancel, activeOrderId]);

  const { subtotal, itemCount } = useMemo(() => ({
    subtotal: cartItems.reduce((acc, i) => acc + (i.price * i.quantity), 0),
    itemCount: cartItems.reduce((acc, i) => acc + i.quantity, 0)
  }), [cartItems]);

  const columns = [
    { title: 'Produto', dataIndex: 'name', key: 'name', render: (name, r) => (
        <Space><Avatar shape="square" src={r.image_url} icon={<ShoppingOutlined />} style={{ backgroundColor: '#f0f2f5' }} />
          <div><Text strong>{name}</Text>{r.stock <= 0 && <Tag color="error" style={{ marginLeft: 8, fontSize: 10 }}>Sem Estoque</Tag>}</div></Space>
      ) },
    { title: 'Qtd', key: 'qty', width: 120, align: 'center', render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: 6, padding: 4 }}>
          <Button type="text" size="small" icon={<MinusOutlined />} onClick={() => updateQty(r, -1)} loading={isSyncing} />
          <Text strong style={{ margin: '0 8px', width: 24, textAlign: 'center' }}>{r.quantity}</Text>
          <Button type="text" size="small" icon={<PlusOutlined />} onClick={() => updateQty(r, 1)} loading={isSyncing} />
        </div>
      ) },
    { title: 'Total', key: 'total', align: 'right', render: (_, r) => <Text strong>R$ {(r.price * r.quantity).toFixed(2)}</Text> },
    { key: 'act', width: 50, render: (_, r) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => updateQty(r, -9999)} /> }
  ];

  if (pageLoading) return <Spin size="large" fullscreen tip="Carregando PDV..." />;

  return (
    <>
      <POSStyles />
      <div className="pos-container">
        <div className="pos-left-panel">
          
          {/* --- BOTÕES DE MULTIPLICADOR RÁPIDO --- */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 0 }}>
             {[2, 3, 4, 5, 6, 10, 12].map(n => (
                 <Button 
                    key={n} 
                    size="small" 
                    onClick={() => handleQuickMultiplier(n)}
                    className="multiplier-btn"
                    icon={<ThunderboltFilled style={{fontSize: 10}} />}
                 >
                    +{n}
                 </Button>
             ))}
          </div>

          <div className="search-wrapper">
            <AutoComplete options={autocompleteOptions} style={{ width: '100%' }} onSelect={(_, opt) => addProductToCart(opt.productData)} onSearch={setSearchValue} value={searchValue} backfill>
              <Input ref={searchInputRef} size="large" placeholder="Escaneie o código ou digite..." prefix={<ScanOutlined style={{ fontSize: 20, color: '#0052CC', marginRight: 8 }} />} onPressEnter={handleExactSearch} suffix={isSyncing ? <SyncOutlined spin style={{color:'#0052CC'}} /> : (searchLoading ? <Spin size="small"/> : <div style={{ fontSize: 12, color: '#999', border: '1px solid #ddd', padding: '0 6px', borderRadius: 4 }}>ENTER</div>)} />
            </AutoComplete>
          </div>
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Table className="custom-cart-table" columns={columns} dataSource={cartItems} rowKey="key" pagination={false} scroll={{ y: 'calc(100vh - 320px)' }} rowClassName={(r) => r.id === lastAddedItem?.id ? 'row-highlight-new' : ''} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Caixa livre. Inicie uma venda." /> }} />
          </div>
        </div>
        <div className="pos-right-panel">
          {activeOrderId && <div style={{ background: '#E3FCEF', padding: '8px 12px', borderRadius: 8, color: '#006644', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><SaveOutlined /> Venda #{activeOrderId} salva no sistema.</div>}
          <div className="info-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><Text type="secondary" strong style={{ fontSize: 12, textTransform: 'uppercase' }}>Cliente</Text>{!selectedCustomer && (<Button type="link" size="small" style={{ padding: 0 }} onClick={() => setIsCustomerModalVisible(true)}>+ Novo</Button>)}</div>
            {selectedCustomer ? (<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F4F5F7', padding: 12, borderRadius: 8 }}><Space><Avatar style={{ backgroundColor: '#0052CC' }}>{selectedCustomer.full_name[0]}</Avatar><div><Text strong display="block">{selectedCustomer.full_name}</Text>{selectedCustomer.loyalty_points > 0 && (<div style={{ display: 'flex', alignItems: 'center', fontSize: 12, color: '#faad14' }}><StarFilled style={{ marginRight: 4 }} /> {selectedCustomer.loyalty_points} pts</div>)}</div></Space><Button type="text" icon={<CloseCircleOutlined />} onClick={() => setSelectedCustomer(null)} /></div>) : (<Select showSearch placeholder="Selecionar Cliente (Opcional)" style={{ width: '100%' }} size="large" onSearch={setCustomerSearchValue} onFocus={() => fetchCustomers('')} filterOption={false} options={customerOptions} onChange={(_, opt) => { setSelectedCustomer(opt.customerData); setCustomerOptions([]); }} notFoundContent={customerLoading ? <Spin size="small" /> : null} />)}
          </div>
          <div className="info-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 180 }}>
            <AnimatePresence mode="wait">{lastAddedItem ? (<motion.div key={lastAddedItem.id} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: 'center', width: '100%' }}><Badge count={lastAddedItem.quantity > 1 ? `x${cartItems.find(i=>i.id===lastAddedItem.id)?.quantity}` : 0} color="blue"><Image src={lastAddedItem.image_url} width={120} height={120} style={{ objectFit: 'cover', borderRadius: 12, border: '1px solid #eee' }} preview={false} fallback="https://via.placeholder.com/150?text=Sem+Foto" /></Badge><Title level={5} style={{ marginTop: 12, marginBottom: 4 }}>{lastAddedItem.name}</Title><Text type="secondary">R$ {lastAddedItem.price.toFixed(2)} / un</Text><div style={{ marginTop: 12, color: '#36B37E', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12 }}><CheckCircleFilled /> Adicionado</div></motion.div>) : (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', color: '#ccc' }}><ShoppingOutlined style={{ fontSize: 64, marginBottom: 16, opacity: 0.5 }} /><p>Aguardando produtos...</p></motion.div>)}</AnimatePresence>
          </div>
          <div className="totals-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><Text>Itens: {itemCount}</Text>{isSyncing && <Text style={{fontSize:12}}><SyncOutlined spin/> Salvando...</Text>}</div>
            <Divider style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '12px 0' }} />
            <Text>TOTAL A PAGAR</Text><div className="amount-display">R$ {subtotal.toFixed(2)}</div>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Button type="primary" className="action-btn-lg" style={{ background: '#36B37E', borderColor: '#36B37E' }} block disabled={!activeOrderId && cartItems.length === 0} onClick={handleOpenPaymentModal}><span className="key-badge">F6</span> FINALIZAR VENDA</Button>
              <Button danger className="action-btn-lg" block ghost disabled={!activeOrderId} onClick={handleRequestCancel}><span className="key-badge" style={{ background: 'rgba(255,77,79,0.1)', color: '#ff4d4f' }}>F3</span> CANCELAR</Button>
            </Space>
          </div>
        </div>
      </div>
      <PaymentModal open={isPaymentModalOpen} onCancel={() => setIsPaymentModalOpen(false)} onOk={handleSaleSuccess} cartItems={cartItems.map(i => ({ product_id: i.id, quantity: i.quantity, price_at_sale: i.price }))} totalAmount={subtotal} customerId={selectedCustomer?.id} orderId={activeOrderId} />
      <Modal title="Novo Cliente" open={isCustomerModalVisible} onCancel={() => setIsCustomerModalVisible(false)} footer={null} destroyOnClose><CustomerForm form={customerForm} onFinish={handleCreateCustomer} onCancel={() => setIsCustomerModalVisible(false)} /></Modal>
      <Modal
        title={<span style={{color: '#ff4d4f', display: 'flex', alignItems: 'center', gap: 8}}><WarningOutlined /> Cancelar Venda?</span>}
        open={isCancelModalVisible}
        onOk={confirmCancelSale}
        onCancel={() => setIsCancelModalVisible(false)}
        okText="Sim, Cancelar"
        cancelText="Voltar"
        okButtonProps={{ danger: true, loading: isSyncing }}
      >
        <p>Tem certeza que deseja cancelar a venda atual? Todos os itens serão removidos e a comanda será encerrada.</p>
      </Modal>
    </>
  );
};

export default POSPage;