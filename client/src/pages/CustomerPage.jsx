import React, { useState, useEffect, useMemo, useCallback } from 'react';
// Importando todos os componentes necessários do AntD
import { Button, Modal, message, Space, Input, Typography, Popconfirm, Tooltip, Card, Avatar, Empty, Spin, Form, Tag } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, SearchOutlined, MailOutlined, PhoneOutlined, StarOutlined } from '@ant-design/icons';
import ApiService from '../api/ApiService';

const { Title, Text } = Typography;
const { Search } = Input;

// Estilos embutidos para a nova página
const PageStyles = () => (
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

    .customer-page-container {
      padding: 24px;
      background-color: #f0f2f5;
      font-family: 'Inter', sans-serif;
      min-height: 100vh;
    }

    .customer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding: 20px 24px;
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
      border-radius: 16px;
      color: white;
      box-shadow: 0 10px 30px -10px rgba(52, 152, 219, 0.5);
    }

    .controls-card {
        margin-bottom: 24px;
        border-radius: 12px;
    }
    
    .customer-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 24px;
    }

    .customer-card {
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      border: 1px solid #e8e8e8;
      transition: all 0.3s ease-in-out;
      position: relative;
    }

    .customer-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 12px 24px rgba(0,0,0,0.12);
    }
    
    .card-actions {
      position: absolute;
      top: 16px;
      right: 16px;
    }
    
    .contact-info {
        margin-top: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    
    .customer-form-buttons {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 24px;
    }
  `}</style>
);

// Formulário integrado para evitar dependências externas
const CustomerForm = ({ customer, onSuccess, onCancel }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
  
    useEffect(() => {
      if (customer) {
        form.setFieldsValue(customer);
      } else {
        form.resetFields();
      }
    }, [customer, form]);
  
    const onFinish = async (values) => {
      setLoading(true);
      try {
        if (customer) {
          await ApiService.put(`/customers/${customer.id}/`, values);
          message.success(`Cliente "${values.full_name}" atualizado com sucesso!`);
        } else {
          await ApiService.post('/customers/', values);
          message.success(`Cliente "${values.full_name}" criado com sucesso!`);
        }
        onSuccess();
      } catch (error) {
        const errorMsg = error.response?.data?.detail || 'Erro ao salvar o cliente.';
        message.error(errorMsg);
      } finally {
        setLoading(false);
      }
    };
  
    return (
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="full_name" label="Nome Completo" rules={[{ required: true, message: 'Por favor, insira o nome completo!' }]}>
          <Input prefix={<UserOutlined />} placeholder="Ex: João da Silva" size="large" />
        </Form.Item>
        <Form.Item name="email" label="E-mail" rules={[{ type: 'email', message: 'Por favor, insira um e-mail válido!' }]}>
          <Input prefix={<MailOutlined />} placeholder="Ex: joao.silva@email.com" size="large" />
        </Form.Item>
        <Form.Item name="phone_number" label="Telefone">
          <Input prefix={<PhoneOutlined />} placeholder="Ex: (16) 99999-8888" size="large" />
        </Form.Item>
        <div className="customer-form-buttons">
          <Button onClick={onCancel} size="large">Cancelar</Button>
          <Button type="primary" htmlType="submit" loading={loading} size="large">
            {customer ? 'Salvar Alterações' : 'Adicionar Cliente'}
          </Button>
        </div>
      </Form>
    );
};


const CustomerPage = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        try {
            const response = await ApiService.get('/customers/');
            setCustomers(response.data);
        } catch (error) {
            message.error('Não foi possível carregar os clientes.');
            console.error('Erro ao buscar clientes:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    const showModal = (customer = null) => {
        setEditingCustomer(customer);
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingCustomer(null);
    };

    const handleFormSuccess = () => {
        setIsModalVisible(false);
        setEditingCustomer(null);
        fetchCustomers();
    };
    
    const handleDelete = async (customerId) => {
        try {
          await ApiService.delete(`/customers/${customerId}`);
          message.success('Cliente excluído com sucesso!');
          fetchCustomers();
        } catch (error) {
          message.error('Erro ao excluir o cliente.');
        }
    };

    const filteredCustomers = useMemo(() => {
        if (!searchTerm) return customers;
        return customers.filter(c =>
            c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [customers, searchTerm]);

    const gridVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
    const cardVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

    return (
        <>
            <PageStyles />
            <motion.div className="customer-page-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="customer-header">
                    <Title level={2} style={{ color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <UserOutlined /> Gestão de Clientes
                    </Title>
                </div>
                
                <Card className="controls-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Search
                            placeholder="Pesquisar clientes..."
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ maxWidth: 400 }}
                            allowClear size="large"
                        />
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()} size="large">
                            Adicionar Cliente
                        </Button>
                    </div>
                </Card>

                {loading ? <div style={{textAlign: 'center', padding: 50}}><Spin size="large" /></div> : (
                    <AnimatePresence>
                        {filteredCustomers.length > 0 ? (
                            <motion.div className="customer-grid" variants={gridVariants} initial="hidden" animate="visible">
                                {filteredCustomers.map(customer => (
                                    <motion.div key={customer.id} variants={cardVariants}>
                                        <Card className="customer-card">
                                            <div className="card-actions">
                                                <Space>
                                                    <Tooltip title="Editar"><Button shape="circle" icon={<EditOutlined />} onClick={() => showModal(customer)} /></Tooltip>
                                                    <Popconfirm title="Tem certeza?" onConfirm={() => handleDelete(customer.id)} okText="Sim" cancelText="Não">
                                                        <Tooltip title="Excluir"><Button shape="circle" danger icon={<DeleteOutlined />} /></Tooltip>
                                                    </Popconfirm>
                                                </Space>
                                            </div>
                                            <Space align="start">
                                                <Avatar size={48} icon={<UserOutlined />} style={{backgroundColor: '#1890ff'}}/>
                                                <div>
                                                    <Title level={4} style={{marginBottom: 0}}>{customer.full_name}</Title>
                                                    <Tag icon={<StarOutlined />} color="gold">{customer.loyalty_points} Pontos</Tag>
                                                </div>
                                            </Space>
                                            <div className="contact-info">
                                                {customer.email && <Text><MailOutlined style={{marginRight: 8, color: '#3498db'}}/> {customer.email}</Text>}
                                                {customer.phone_number && <Text><PhoneOutlined style={{marginRight: 8, color: '#3498db'}}/> {customer.phone_number}</Text>}
                                            </div>
                                        </Card>
                                    </motion.div>
                                ))}
                            </motion.div>
                        ) : (
                            <Empty description={<Title level={5} style={{color: '#888'}}>Nenhum cliente encontrado.</Title>} />
                        )}
                    </AnimatePresence>
                )}

                <Modal
                    title={editingCustomer ? "Editar Cliente" : "Adicionar Novo Cliente"}
                    open={isModalVisible}
                    onCancel={handleCancel}
                    footer={null}
                    destroyOnClose
                >
                    <CustomerForm customer={editingCustomer} onSuccess={handleFormSuccess} onCancel={handleCancel} />
                </Modal>
            </motion.div>
        </>
    );
};

export default CustomerPage;