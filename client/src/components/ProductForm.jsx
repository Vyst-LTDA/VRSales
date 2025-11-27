// client/src/components/ProductForm.jsx
import React, { useEffect, useState } from 'react';
import { Form, Input, InputNumber, Button, message, Row, Col, Select, Switch, DatePicker, Modal, Space } from 'antd';
import {
    AppstoreOutlined, DropboxOutlined, WarningOutlined, BarcodeOutlined, LinkOutlined, PlusOutlined
} from '@ant-design/icons';
import ApiService from '../api/ApiService';

const { Option } = Select;

const ProductForm = ({ product, onSuccess, onCancel }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    
    const [suppliers, setSuppliers] = useState([]);
    const [categories, setCategories] = useState([]); 
    const [loadingData, setLoadingData] = useState(false);
    
    const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [creatingCategory, setCreatingCategory] = useState(false);

    const isEditing = !!product;

    useEffect(() => {
        const fetchData = async () => {
            setLoadingData(true);
            try {
                const results = await Promise.allSettled([
                    ApiService.getSuppliers(),
                    ApiService.getCategories()
                ]);
                const suppliersRes = results[0].status === 'fulfilled' ? results[0].value : { data: [] };
                const categoriesRes = results[1].status === 'fulfilled' ? results[1].value : { data: [] };

                setSuppliers(suppliersRes.data || []);
                setCategories(categoriesRes.data || []);
            } catch (error) {
                console.error("Erro ao carregar dados:", error);
            } finally {
                setLoadingData(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (isEditing && product) {
            form.setFieldsValue({
                name: product.name,
                description: product.description,
                price: product.price,
                cost_price: product.cost_price,
                stock: product.stock,
                low_stock_threshold: product.low_stock_threshold,
                barcode: product.barcode,
                image_url: product.image_url,
                supplier_id: product.supplier_id || product.supplier?.id,
                category_id: product.category_id || product.category?.id,
                // send_to_kitchen: product.send_to_kitchen // Campo removido do backend por enquanto
            });
        } else {
            form.resetFields();
            form.setFieldsValue({ low_stock_threshold: 10, stock: 0 });
        }
    }, [product, form, isEditing]);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            // --- LIMPEZA ESTRITA DO PAYLOAD ---
            // Criamos um objeto novo apenas com os campos permitidos pelo Schema do Backend
            const payload = {
                name: values.name,
                description: values.description || null,
                price: Number(values.price),
                stock: Number(values.stock),
                low_stock_threshold: Number(values.low_stock_threshold || 10),
                
                // Campos opcionais: Enviar null se estiverem vazios/undefined
                cost_price: values.cost_price ? Number(values.cost_price) : null,
                barcode: values.barcode || null,
                image_url: values.image_url || null,
                
                // IDs (Foreign Keys): Garantir que sejam números ou null
                supplier_id: values.supplier_id ? Number(values.supplier_id) : null,
                category_id: values.category_id ? Number(values.category_id) : null,
            };

            // Data de Validade (apenas na criação)
            if (!isEditing && values.expiration_date) {
                payload.expiration_date = values.expiration_date.format('YYYY-MM-DD');
            }

            console.log("Payload enviado:", payload); // Para debug no console do navegador

            if (isEditing) {
                await ApiService.updateProduct(product.id, payload);
            } else {
                await ApiService.createProduct(payload);
            }
            onSuccess();
        } catch (error) {
            console.error("Erro ao salvar:", error);
            const errorData = error.response?.data;
            
            // Mensagem de erro detalhada para 422
            if (error.response?.status === 422 && errorData?.detail) {
                const details = Array.isArray(errorData.detail) 
                    ? errorData.detail.map(err => `${err.loc[1]}: ${err.msg}`).join(' | ')
                    : errorData.detail;
                message.error(`Erro de validação: ${details}`, 5);
            } else {
                message.error(errorData?.detail || 'Falha ao salvar o produto.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;
        setCreatingCategory(true);
        try {
            const res = await ApiService.createCategory({ name: newCategoryName });
            message.success('Categoria criada!');
            const newCat = res.data;
            setCategories(prev => [...prev, newCat]);
            form.setFieldsValue({ category_id: newCat.id });
            setNewCategoryName('');
            setIsCategoryModalVisible(false);
        } catch (error) {
            console.error(error);
            message.error('Erro ao criar categoria.');
        } finally {
            setCreatingCategory(false);
        }
    };

    return (
        <>
            <Form form={form} layout="vertical" onFinish={onFinish}>
                <Form.Item name="name" label="Nome do Produto" rules={[{ required: true, message: 'Obrigatório' }]}>
                    <Input size="large" prefix={<AppstoreOutlined />} placeholder="Ex: Coca-Cola 2L" />
                </Form.Item>

                <Form.Item name="description" label="Descrição (Opcional)">
                    <Input.TextArea rows={2} />
                </Form.Item>

                <Row gutter={16}>
                    <Col xs={24} sm={12}>
                        <Form.Item name="price" label="Preço de Venda" rules={[{ required: true, message: 'Obrigatório' }]}>
                            <InputNumber size="large" style={{ width: '100%' }} min={0} precision={2} prefix="R$" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item name="cost_price" label="Preço de Custo (Opcional)">
                            <InputNumber size="large" style={{ width: '100%' }} min={0} precision={2} prefix="R$" />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col xs={24} sm={12}>
                        <Form.Item name="supplier_id" label="Fornecedor (Opcional)">
                            <Select
                                showSearch
                                placeholder="Selecione..."
                                loading={loadingData}
                                allowClear
                                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                options={suppliers.map(s => ({ value: s.id, label: s.name }))}
                                size="large"
                            />
                        </Form.Item>
                    </Col>
                    
                    <Col xs={24} sm={12}>
                        <Form.Item label="Categoria (Opcional)" style={{marginBottom: 0}}>
                            <Space.Compact style={{ width: '100%' }}>
                                <Form.Item name="category_id" noStyle>
                                    <Select
                                        placeholder="Selecione..."
                                        loading={loadingData}
                                        allowClear
                                        filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                        options={categories.map(c => ({ value: c.id, label: c.name }))}
                                        size="large"
                                        style={{ width: 'calc(100% - 46px)' }}
                                    />
                                </Form.Item>
                                <Button 
                                    icon={<PlusOutlined />} 
                                    size="large" 
                                    type="primary"
                                    onClick={() => setIsCategoryModalVisible(true)}
                                    title="Nova Categoria"
                                />
                            </Space.Compact>
                        </Form.Item>
                        <div style={{ marginBottom: 24 }}></div>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col xs={24} sm={12}>
                        <Form.Item name="barcode" label="Código de Barras (Opcional)">
                            <Input size="large" prefix={<BarcodeOutlined />} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item name="image_url" label="URL da Imagem (Opcional)">
                            <Input size="large" prefix={<LinkOutlined />} placeholder="https://..." />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col xs={24} sm={12}>
                        <Form.Item name="stock" label="Estoque Inicial" rules={[{ required: true, message: 'Obrigatório' }]}>
                            <InputNumber size="large" style={{ width: '100%' }} prefix={<DropboxOutlined />} disabled={isEditing} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item name="low_stock_threshold" label="Nível Mínimo (Alerta)" rules={[{ required: true, message: 'Obrigatório' }]}>
                            <InputNumber size="large" style={{ width: '100%' }} min={0} prefix={<WarningOutlined />} />
                        </Form.Item>
                    </Col>
                </Row>
                
                {!isEditing && (
                    <Form.Item name="expiration_date" label="Data de Validade (Lote Inicial)">
                        <DatePicker style={{ width: '100%' }} size="large" format="DD/MM/YYYY" placeholder="Selecione a validade" />
                    </Form.Item>
                )}

                {/* Campo send_to_kitchen removido da UI para evitar confusão até o backend suportar */}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: 24 }}>
                    <Button onClick={onCancel} size="large">Cancelar</Button>
                    <Button type="primary" htmlType="submit" loading={loading} size="large">
                        {isEditing ? 'Salvar Alterações' : 'Criar Produto'}
                    </Button>
                </div>
            </Form>

            <Modal
                title="Nova Categoria"
                open={isCategoryModalVisible}
                onCancel={() => setIsCategoryModalVisible(false)}
                onOk={handleCreateCategory}
                confirmLoading={creatingCategory}
                okText="Criar"
                cancelText="Cancelar"
                destroyOnClose
            >
                <Input 
                    placeholder="Nome da Categoria (ex: Bebidas)" 
                    value={newCategoryName} 
                    onChange={e => setNewCategoryName(e.target.value)} 
                    onPressEnter={handleCreateCategory}
                    autoFocus
                />
            </Modal>
        </>
    );
};

export default ProductForm;