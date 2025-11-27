import React, { useEffect, useState } from 'react';
import { Form, Input, InputNumber, Button, message, Row, Col, Select, Switch, DatePicker } from 'antd';
import {
    AppstoreOutlined, DollarCircleOutlined, DropboxOutlined,
    WarningOutlined, BarcodeOutlined, LinkOutlined
} from '@ant-design/icons';
import ApiService from '../api/ApiService';

const { Option } = Select;

const ProductForm = ({ product, onSuccess, onCancel }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [suppliers, setSuppliers] = useState([]);
    const [loadingSuppliers, setLoadingSuppliers] = useState(false);
    
    // Verifica se é modo de edição (se 'product' existe)
    const isEditing = !!product;

    useEffect(() => {
        const fetchSuppliers = async () => {
            setLoadingSuppliers(true);
            try {
                const response = await ApiService.getSuppliers();
                setSuppliers(response.data || []);
            } catch (error) {
                message.error('Falha ao carregar fornecedores.');
            } finally {
                setLoadingSuppliers(false);
            }
        };
        if (suppliers.length === 0) {
            fetchSuppliers();
        }
    }, [suppliers.length]);

    useEffect(() => {
        if (isEditing && product) {
            form.setFieldsValue({
                ...product,
                price: product.price !== undefined ? Number(product.price) : undefined,
                cost_price: product.cost_price !== undefined && product.cost_price !== null ? Number(product.cost_price) : undefined,
                stock: product.stock !== undefined ? Number(product.stock) : undefined,
                low_stock_threshold: product.low_stock_threshold !== undefined ? Number(product.low_stock_threshold) : 10,
                supplier_id: product.supplier?.id || product.supplier_id,
                send_to_kitchen: product.send_to_kitchen // Carrega o valor do switch
            });
        } else {
            form.resetFields();
        }
    }, [product, form, isEditing]);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            const apiValues = {
                ...values,
                price: values.price !== undefined && values.price !== null ? Number(values.price) : 0,
                cost_price: values.cost_price !== undefined && values.cost_price !== null ? Number(values.cost_price) : null,
                stock: values.stock !== undefined && values.stock !== null ? Number(values.stock) : 0,
                low_stock_threshold: values.low_stock_threshold !== undefined && values.low_stock_threshold !== null ? Number(values.low_stock_threshold) : 10,
                supplier_id: values.supplier_id || null,
                send_to_kitchen: !!values.send_to_kitchen,
                // Formata a data para YYYY-MM-DD se ela existir
                expiration_date: values.expiration_date ? values.expiration_date.format('YYYY-MM-DD') : null
            };

            if (isEditing) {
                // Na edição, não enviamos expiration_date, pois é tratado via lotes separados
                delete apiValues.expiration_date;
                await ApiService.updateProduct(product.id, apiValues);
            } else {
                await ApiService.createProduct(apiValues);
            }
            onSuccess();
        } catch (error) {
            console.error("Erro ao salvar produto:", error.response?.data || error);
            message.error(error.response?.data?.detail || 'Falha ao salvar o produto.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Form form={form} layout="vertical" onFinish={onFinish}>
            <Form.Item name="name" label="Nome do Produto" rules={[{ required: true, message: 'Insira o nome!' }]}>
                <Input size="large" prefix={<AppstoreOutlined />} placeholder="Ex: Coca-Cola 2L" />
            </Form.Item>

            <Form.Item name="description" label="Descrição (Opcional)">
                <Input.TextArea rows={2} placeholder="Breve descrição do produto" />
            </Form.Item>

            <Row gutter={16}>
                <Col xs={24} sm={12}>
                    <Form.Item name="price" label="Preço de Venda" rules={[{ required: true, message: 'Insira o preço!' }]}>
                        <InputNumber size="large" style={{ width: '100%' }} min={0} step={0.01} precision={2} prefix="R$" />
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                     <Form.Item name="cost_price" label="Preço de Custo (Opcional)">
                        <InputNumber size="large" style={{ width: '100%' }} min={0} step={0.01} precision={2} prefix="R$" />
                    </Form.Item>
                </Col>
            </Row>

             <Form.Item name="supplier_id" label="Fornecedor (Opcional)">
                <Select
                    showSearch
                    placeholder="Selecione um fornecedor"
                    loading={loadingSuppliers}
                    allowClear
                    filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={suppliers.map(s => ({ value: s.id, label: s.name }))}
                    size="large"
                />
            </Form.Item>

            <Row gutter={16}>
                <Col xs={24} sm={12}>
                    <Form.Item name="barcode" label="Código de Barras (Opcional)">
                        <Input size="large" prefix={<BarcodeOutlined />} />
                    </Form.Item>
                </Col>
                 <Col xs={24} sm={12}>
                     <Form.Item name="image_url" label="URL da Imagem (Opcional)">
                        <Input size="large" prefix={<LinkOutlined />} placeholder="https://exemplo.com/imagem.png" />
                    </Form.Item>
                 </Col>
            </Row>

            <Row gutter={16}>
                <Col xs={24} sm={12}>
                    <Form.Item name="stock" label="Estoque Inicial" rules={[{ required: true, message: 'Insira o estoque!' }]}>
                        <InputNumber size="large" style={{ width: '100%' }} prefix={<DropboxOutlined />} />
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                    <Form.Item name="low_stock_threshold" label="Nível Mínimo" rules={[{ required: true, message: 'Insira o nível mínimo!' }]}>
                        <InputNumber size="large" style={{ width: '100%' }} min={0} prefix={<WarningOutlined />} />
                    </Form.Item>
                </Col>
            </Row>
            
            {/* --- CAMPO DE VALIDADE (Só aparece ao criar) --- */}
            {!isEditing && (
                <Form.Item 
                    name="expiration_date" 
                    label="Data de Validade (Lote Inicial)"
                    tooltip="Se preenchido, cria automaticamente um lote com esta validade."
                >
                    <DatePicker 
                        style={{ width: '100%' }} 
                        size="large" 
                        format="DD/MM/YYYY"
                        placeholder="Selecione a validade"
                    />
                </Form.Item>
            )}

            {/* --- RODAPÉ: Switch e Botões na mesma linha --- */}
            <Row align="bottom" justify="space-between" style={{ marginTop: 24 }}>
                <Col>
                    <Form.Item 
                        name="send_to_kitchen" 
                        label="Enviar para Cozinha?" 
                        valuePropName="checked"
                        style={{ marginBottom: 0 }} // Remove margem inferior para alinhar com botões
                    >
                        <Switch checkedChildren="Sim" unCheckedChildren="Não" />
                    </Form.Item>
                </Col>
                <Col>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button onClick={onCancel} size="large">
                            Cancelar
                        </Button>
                        <Button type="primary" htmlType="submit" loading={loading} size="large">
                            {isEditing ? 'Salvar Alterações' : 'Criar Produto'}
                        </Button>
                    </div>
                </Col>
            </Row>
        </Form>
    );
};

export default ProductForm;