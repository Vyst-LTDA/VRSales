// client/src/components/ProductForm.jsx
import React, { useEffect, useState } from 'react';
import { Form, Input, InputNumber, Button, message, Row, Col, Select } from 'antd'; // Adicionado Select
import {
    AppstoreOutlined, AlignLeftOutlined, DollarCircleOutlined, DropboxOutlined,
    WarningOutlined, BarcodeOutlined, LinkOutlined, ShopOutlined // Adicionado ShopOutlined
} from '@ant-design/icons';
import ApiService from '../api/ApiService';

const { Option } = Select; // Adicionado Option

const ProductForm = ({ product, onSuccess, onCancel }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [suppliers, setSuppliers] = useState([]); // Estado para fornecedores
    const [loadingSuppliers, setLoadingSuppliers] = useState(false); // Estado de loading
    const isEditing = !!product;

    // Busca fornecedores quando o modal é aberto (se não tiverem sido carregados)
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
        // Só busca se o modal estiver visível E a lista estiver vazia
        if (suppliers.length === 0) {
            fetchSuppliers();
        }
    }, [suppliers.length]); // Depende apenas do tamanho da lista


    // Preenche o formulário ao editar ou reseta ao criar
    useEffect(() => {
        if (isEditing && product) {
            form.setFieldsValue({
                ...product,
                price: product.price !== undefined ? Number(product.price) : undefined,
                cost_price: product.cost_price !== undefined && product.cost_price !== null ? Number(product.cost_price) : undefined, // <-- NOVO
                stock: product.stock !== undefined ? Number(product.stock) : undefined,
                low_stock_threshold: product.low_stock_threshold !== undefined ? Number(product.low_stock_threshold) : 10,
                supplier_id: product.supplier?.id || product.supplier_id // <-- NOVO (usa o ID do objeto supplier se carregado)
            });
        } else {
            form.resetFields(); // Limpa tudo para criação
        }
    }, [product, form, isEditing]);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            // Garante que valores numéricos sejam números
            const apiValues = {
                ...values,
                price: values.price !== undefined && values.price !== null ? Number(values.price) : 0,
                cost_price: values.cost_price !== undefined && values.cost_price !== null ? Number(values.cost_price) : null, // <-- NOVO (permite null)
                stock: values.stock !== undefined && values.stock !== null ? Number(values.stock) : 0,
                low_stock_threshold: values.low_stock_threshold !== undefined && values.low_stock_threshold !== null ? Number(values.low_stock_threshold) : 10,
                supplier_id: values.supplier_id || null // <-- NOVO (envia null se não selecionado)
            };

            if (isEditing) {
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
        // Não precisa mais de initialValues aqui se usamos setFieldsValue
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
                {/* --- NOVO CAMPO: Preço de Custo --- */}
                <Col xs={24} sm={12}>
                     <Form.Item name="cost_price" label="Preço de Custo (Opcional)">
                        <InputNumber size="large" style={{ width: '100%' }} min={0} step={0.01} precision={2} prefix="R$" />
                    </Form.Item>
                </Col>
                 {/* --- FIM NOVO CAMPO --- */}
            </Row>

             {/* --- NOVO CAMPO: Fornecedor --- */}
             <Form.Item name="supplier_id" label="Fornecedor (Opcional)">
                <Select
                    showSearch
                    placeholder="Selecione um fornecedor"
                    loading={loadingSuppliers}
                    allowClear
                    filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={suppliers.map(s => ({ value: s.id, label: s.name }))} // Formato para Antd v5+
                    size="large"
                >
                    {/* Options são geradas a partir da prop 'options' */}
                </Select>
            </Form.Item>
             {/* --- FIM NOVO CAMPO --- */}


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
                    <Form.Item name="stock" label="Estoque Atual" rules={[{ required: true, message: 'Insira o estoque!' }]}>
                        <InputNumber size="large" style={{ width: '100%' }} prefix={<DropboxOutlined />} />
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                    <Form.Item name="low_stock_threshold" label="Nível Mínimo" rules={[{ required: true, message: 'Insira o nível mínimo!' }]}>
                        <InputNumber size="large" style={{ width: '100%' }} min={0} prefix={<WarningOutlined />} />
                    </Form.Item>
                </Col>
            </Row>


            {/* TODO: Adicionar campos para Categoria/Subcategoria e Tipo de Produto */}


            <div className="product-form-buttons">
                <Button onClick={onCancel} size="large">
                    Cancelar
                </Button>
                <Button type="primary" htmlType="submit" loading={loading} size="large">
                    {isEditing ? 'Salvar Alterações' : 'Criar Produto'}
                </Button>
            </div>
        </Form>
    );
};

export default ProductForm;