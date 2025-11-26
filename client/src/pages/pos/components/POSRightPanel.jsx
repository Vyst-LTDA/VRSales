import React from 'react';
import { Button, Select, Spin, Space, Row, Col, Typography } from 'antd';
import { UserOutlined, PlusOutlined, CloseCircleOutlined, CheckCircleOutlined, ClockCircleOutlined, ShoppingOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';

const { Text } = Typography;

const POSRightPanel = ({
  currentTime,
  subtotal,
  totalItems,
  lastAddedItem,
  selectedCustomer,
  setSelectedCustomer,
  customerSearchValue,
  setCustomerSearchValue,
  customerOptions,
  customerLoading,
  fetchCustomers,
  onOpenCustomerModal,
  onCancelSale,
  onFinalizeSale,
  cartEmpty
}) => {

  return (
    <div className="pos-right">
      
      {/* Relógio e Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, opacity: 0.7 }}>
          <Space><ClockCircleOutlined /> {currentTime}</Space>
          <Text style={{ color: '#fff' }}>Itens: {totalItems}</Text>
      </div>

      {/* Card do Cliente */}
      <div className="customer-card">
         <div style={{ display: 'flex', gap: 8 }}>
            <Select
                showSearch
                allowClear
                placeholder="Identificar Cliente (CPF/Nome)"
                style={{ width: '100%' }}
                value={selectedCustomer?.id}
                onSearch={setCustomerSearchValue}
                onChange={(val, opt) => setSelectedCustomer(opt?.customerData || null)}
                onDropdownVisibleChange={(open) => open && customerOptions.length === 0 && fetchCustomers()}
                options={customerOptions}
                notFoundContent={customerLoading ? <Spin size="small" /> : null}
                dropdownStyle={{ minWidth: 300 }}
            />
            <Button icon={<PlusOutlined />} onClick={onOpenCustomerModal} ghost />
         </div>
         {selectedCustomer && (
             <div style={{ marginTop: 12, color: '#A7F3D0', fontSize: '0.9rem' }}>
                 <CheckCircleOutlined /> Cliente Fidelidade: {selectedCustomer.loyalty_points || 0} pts
             </div>
         )}
      </div>

      {/* Destaque do Último Item */}
      <div className="last-item-highlight">
        <AnimatePresence mode="wait">
            {lastAddedItem ? (
                <motion.div 
                    key={lastAddedItem.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    style={{ textAlign: 'center', width: '100%' }}
                >
                    <img 
                        src={lastAddedItem.image_url} 
                        className="last-item-img"
                        alt="Produto"
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/140?text=IMG'; }}
                    />
                    <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 4, color: '#fff' }}>
                        {lastAddedItem.name}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#94A3B8' }}>
                        {lastAddedItem.sku || '#SKU-N/A'}
                    </div>
                    <div style={{ marginTop: 12, fontSize: '1.5rem', fontWeight: 700, color: '#60A5FA' }}>
                        R$ {lastAddedItem.price.toFixed(2)}
                    </div>
                </motion.div>
            ) : (
                <div style={{ textAlign: 'center', opacity: 0.3 }}>
                    <ShoppingOutlined style={{ fontSize: 64, marginBottom: 16 }} />
                    <div style={{ fontSize: '1.2rem' }}>Caixa Livre</div>
                </div>
            )}
        </AnimatePresence>
      </div>

      {/* Rodapé de Pagamento */}
      <div className="payment-footer">
          <div className="total-display">
             <div className="total-label">Total a Pagar</div>
             <div className="total-amount">
                <small style={{ fontSize: '2rem', verticalAlign: 'top', marginRight: 4 }}>R$</small>
                {subtotal.toFixed(2)}
             </div>
          </div>

          <Row gutter={16}>
              <Col span={10}>
                  <Button 
                    className="action-btn btn-cancel" 
                    style={{ width: '100%', height: 72 }}
                    onClick={onCancelSale}
                    disabled={cartEmpty}
                  >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2 }}>
                          <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>CANCELAR</span>
                          <span style={{ fontSize: '0.7rem', border: '1px solid currentColor', padding: '0 4px', borderRadius: 4 }}>F3</span>
                      </div>
                  </Button>
              </Col>
              <Col span={14}>
                  <Button 
                    className="action-btn btn-finish" 
                    style={{ width: '100%', height: 72 }}
                    onClick={onFinalizeSale}
                    disabled={cartEmpty}
                  >
                      <span className="kbd-key">F6</span> FINALIZAR
                  </Button>
              </Col>
          </Row>
      </div>
    </div>
  );
};

export default POSRightPanel;