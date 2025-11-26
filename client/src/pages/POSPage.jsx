import React, { useEffect, useState } from 'react';
import { Layout, Modal, message, Form } from 'antd';
import { CloseCircleOutlined } from '@ant-design/icons';

// Imports dos Componentes Modulares
import { posStyles } from './pos/styles';
import POSHeader from './pos/components/POSHeader';
import POSLeftPanel from './pos/components/POSLeftPanel';
import POSRightPanel from './pos/components/POSRightPanel';

// Imports Lógicos e Auxiliares
import { usePOSLogic } from '../hooks/usePOSLogic';
import ApiService from '../api/ApiService';
import PaymentModal from '../components/PaymentModal';
import CustomerForm from '../components/CustomerForm'; 

const POSPage = () => {
  // Hook principal que contém toda a regra de negócio do caixa
  const pos = usePOSLogic();

  // Estados locais para modais que não precisam estar no hook global
  const [isCustomerModalVisible, setIsCustomerModalVisible] = useState(false);
  const [customerForm] = Form.useForm();

  // --- Handlers de Eventos ---

  const handleCancelSaleConfirm = () => {
    Modal.confirm({
      title: 'Cancelar Venda Atual?',
      icon: <CloseCircleOutlined style={{ color: '#EF4444' }} />,
      content: 'O carrinho será esvaziado e os dados removidos.',
      okText: 'Sim, Cancelar',
      okButtonProps: { danger: true },
      cancelText: 'Voltar',
      centered: true,
      onOk: pos.clearSale,
    });
  };

  const handleSaleSuccess = () => {
    pos.clearSale();
    pos.setIsPaymentModalOpen(false);
    message.success('Venda realizada com sucesso!');
    pos.searchInputRef.current?.focus();
  };

  const handleCreateCustomer = async (values) => {
    try {
      const res = await ApiService.post('/customers/', values);
      message.success('Cliente cadastrado!');
      setIsCustomerModalVisible(false);
      pos.setSelectedCustomer(res.data);
      customerForm.resetFields();
    } catch (e) {
      message.error('Erro ao cadastrar cliente.');
    }
  };

  // Atalhos de Teclado Globais
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'F6') {
        event.preventDefault();
        if (pos.cartItems.length > 0) pos.setIsPaymentModalOpen(true);
        else message.warning('Carrinho vazio!');
      }
      if (event.key === 'F3') {
        event.preventDefault();
        if (pos.cartItems.length > 0) handleCancelSaleConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pos.cartItems.length]);

  return (
    <>
      <style>{posStyles}</style>
      
      <div className="pos-container">
        {/* Layout Vertical: Header + Corpo Dividido */}
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            
            <POSHeader cashRegisterStatus={pos.cashRegisterStatus} />

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                
                <POSLeftPanel 
                    cartItems={pos.cartItems}
                    lastAddedItem={pos.lastAddedItem}
                    searchValue={pos.searchValue}
                    setSearchValue={pos.setSearchValue}
                    autocompleteOptions={pos.autocompleteOptions}
                    searchLoading={pos.searchLoading}
                    searchInputRef={pos.searchInputRef}
                    
                    updateQuantity={pos.updateQuantity}
                    removeItem={pos.removeItem}
                    onSelectProduct={pos.addProductToCart}
                />

                <POSRightPanel 
                    currentTime={pos.currentTime}
                    subtotal={pos.subtotal}
                    totalItems={pos.totalItems}
                    lastAddedItem={pos.lastAddedItem}
                    cartEmpty={pos.cartItems.length === 0}
                    
                    selectedCustomer={pos.selectedCustomer}
                    setSelectedCustomer={pos.setSelectedCustomer}
                    
                    // Props de busca de cliente passadas via spread se necessário ou diretas
                    // Como simplificamos, vamos passar as funções de busca do hook se existirem
                    // Caso contrário, implemente a busca de cliente no POSRightPanel ou Hook
                    
                    onOpenCustomerModal={() => setIsCustomerModalVisible(true)}
                    onCancelSale={handleCancelSaleConfirm}
                    onFinalizeSale={() => pos.setIsPaymentModalOpen(true)}
                />

            </div>
        </div>
      </div>

      {/* Modais Globais */}
      <PaymentModal
        open={pos.isPaymentModalOpen}
        onCancel={() => pos.setIsPaymentModalOpen(false)}
        onOk={handleSaleSuccess}
        cartItems={pos.cartItems.map(i => ({ 
            product_id: i.id, 
            quantity: i.quantity, 
            price_at_sale: i.price 
        }))}
        totalAmount={pos.subtotal}
        customerId={pos.selectedCustomer?.id}
      />

      <Modal
        title="Novo Cliente"
        open={isCustomerModalVisible}
        onCancel={() => setIsCustomerModalVisible(false)}
        footer={null}
        destroyOnClose
        centered
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