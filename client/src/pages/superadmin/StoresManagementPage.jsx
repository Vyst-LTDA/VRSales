import React, { useState, useEffect, useCallback } from 'react';
// Garantindo todas as importações necessárias
import { Table, Button, Modal, Form, Input, message, Tag, Switch, Card, Space, Typography, Spin, Tooltip } from 'antd';
import { motion } from 'framer-motion';
import { PlusOutlined, EditOutlined, ShopOutlined, EnvironmentOutlined } from '@ant-design/icons';
import ApiService from '../../api/ApiService';

const { Title } = Typography;

// Estilos embutidos para a nova página
const PageStyles = () => (
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

    .stores-page-container {
      padding: 24px;
      background-color: #f0f2f5;
      font-family: 'Inter', sans-serif;
      min-height: 100vh;
    }

    .stores-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding: 20px 24px;
      background: linear-gradient(135deg, #4b6cb7 0%, #182848 100%);
      border-radius: 16px;
      color: white;
      box-shadow: 0 10px 30px -10px rgba(75, 108, 183, 0.5);
    }

    .controls-card, .table-card {
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        border: none;
        margin-bottom: 24px;
    }

    .stores-table .ant-table {
        border-radius: 8px;
        overflow: hidden;
    }
    
    .stores-table .ant-table-thead > tr > th {
        background-color: #fafafa;
        font-weight: 600;
        color: #333;
    }

    .stores-table .ant-table-tbody > tr > td {
        border-bottom: 1px solid #f0f0f0;
    }

    .stores-table .ant-table-tbody > tr:hover > td {
        background-color: #e6f7ff;
    }
    
    .store-form-buttons {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 24px;
    }
  `}</style>
);


const StoresManagementPage = () => {
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingStore, setEditingStore] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [form] = Form.useForm();

    const fetchStores = useCallback(async () => {
        try {
            setLoading(true);
            // CORREÇÃO: Usando a URL explícita com o método genérico do ApiService
            const response = await ApiService.get('/stores/');
            setStores(response.data);
        } catch (error) {
            // O interceptor do ApiService já deve lidar com o 401 (deslogar)
            // Mostra mensagem apenas para outros erros.
            if (error.response?.status !== 401) {
              message.error('Falha ao carregar a lista de lojas.');
            }
            console.error("Erro ao buscar lojas:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStores();
    }, [fetchStores]);

    const handleOpenModal = (store = null) => {
        setEditingStore(store);
        form.setFieldsValue(store ? { ...store, is_active: !!store.is_active } : { name: '', address: '', is_active: true });
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingStore(null);
        form.resetFields();
    };

    const onFinish = async (values) => {
        setFormLoading(true);
        try {
            const payload = { ...values, is_active: !!values.is_active };
            if (editingStore) {
                await ApiService.put(`/stores/${editingStore.id}`, payload);
                message.success('Loja atualizada com sucesso!');
            } else {
                await ApiService.post('/stores/', payload);
                message.success('Loja criada com sucesso!');
            }
            fetchStores();
            handleCancel();
        } catch (error) {
            message.error(error.response?.data?.detail || 'Ocorreu um erro ao guardar a loja.');
            console.error("Erro ao salvar loja:", error.response?.data || error);
        } finally {
            setFormLoading(false);
        }
    };

    const columns = [
        { title: 'ID', dataIndex: 'id', key: 'id', sorter: (a, b) => a.id - b.id, width: 80 },
        { title: 'Nome da Loja', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
        { title: 'Endereço', dataIndex: 'address', key: 'address' },
        {
            title: 'Status', dataIndex: 'is_active', key: 'is_active', width: 100, align: 'center',
            render: (isActive) => <Tag color={isActive ? 'success' : 'error'}>{isActive ? 'ATIVA' : 'INATIVA'}</Tag>,
            filters: [{ text: 'Ativa', value: true }, { text: 'Inativa', value: false }],
            onFilter: (value, record) => record.is_active === value,
        },
        {
            title: 'Ações', key: 'actions', width: 100, align: 'center',
            render: (_, record) => (
                <Tooltip title="Editar Loja">
                    <Button type="text" icon={<EditOutlined style={{ color: '#1890ff' }} />} onClick={() => handleOpenModal(record)} />
                </Tooltip>
            ),
        },
    ];

    const pageVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
    const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

    return (
        <>
            <PageStyles />
            <motion.div
                className="stores-page-container"
                variants={pageVariants}
                initial="hidden"
                animate="visible"
            >
                <motion.div variants={itemVariants}>
                    <div className="stores-header">
                        <Title level={2} style={{ color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                            <ShopOutlined /> Gestão de Lojas
                        </Title>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants}>
                    <Card className="controls-card">
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()} size="large">
                                Nova Loja
                            </Button>
                        </div>
                    </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                    <Card className="table-card" bodyStyle={{ padding: 0 }}>
                        <Table
                            className="stores-table"
                            columns={columns}
                            dataSource={stores}
                            loading={loading}
                            rowKey="id"
                            pagination={{ pageSize: 10, showSizeChanger: false }}
                        />
                    </Card>
                </motion.div>
                
                <Modal
                    title={editingStore ? 'Editar Loja' : 'Criar Nova Loja'}
                    open={isModalVisible}
                    onCancel={handleCancel}
                    footer={null}
                    // CORREÇÃO: Usando a prop correta para Antd v5+
                    destroyOnHidden
                >
                    {isModalVisible && (
                        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ is_active: true }}>
                            <Form.Item name="name" label="Nome da Loja" rules={[{ required: true, message: 'O nome é obrigatório' }]}>
                                <Input size="large" prefix={<ShopOutlined />} placeholder="Nome da Loja ou Filial"/>
                            </Form.Item>
                            <Form.Item name="address" label="Endereço (Opcional)">
                                <Input size="large" prefix={<EnvironmentOutlined />} placeholder="Rua, Número, Bairro, Cidade - Estado"/>
                            </Form.Item>
                            <Form.Item name="is_active" label="Status da Loja" valuePropName="checked">
                                <Switch checkedChildren="Ativa" unCheckedChildren="Inativa" />
                            </Form.Item>
                            <div className="store-form-buttons">
                                <Button onClick={handleCancel} size="large">Cancelar</Button>
                                <Button type="primary" htmlType="submit" size="large" loading={formLoading}>
                                    {editingStore ? 'Salvar Alterações' : 'Criar Loja'}
                                </Button>
                            </div>
                        </Form>
                    )}
                </Modal>
            </motion.div>
        </>
    );
};

export default StoresManagementPage;