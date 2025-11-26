// client/src/components/StockEntryModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Select, InputNumber, Input, Button, message, Spin } from 'antd';
import { DropboxOutlined, DollarCircleOutlined, ShopOutlined, FileTextOutlined } from '@ant-design/icons';
import ApiService from '../api/ApiService';
import { useDebounce } from '../hooks/useDebounce'; // Assumindo que você tem o hook useDebounce

const { Option } = Select;

const StockEntryModal = ({ open, onCancel, onSuccess }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [suppliers, setSuppliers] = useState([]);
    const [loadingSuppliers, setLoadingSuppliers] = useState(false);

    const debouncedProductSearch = useDebounce(productSearch, 400);

    // Busca produtos baseado na digitação (debounced)
    const fetchProducts = useCallback(async (searchValue) => {
        if (!searchValue || searchValue.length < 2) {
            setProducts([]);
            return;
        }
        setLoadingProducts(true);
        try {
            const response = await ApiService.getProducts({ search: searchValue, limit: 50 }); // Busca com limite
            setProducts(response.data || []);
        } catch (error) {
            message.error('Erro ao buscar produtos.');
            setProducts([]);
        } finally {
            setLoadingProducts(false);
        }
    }, []);

    useEffect(() => {
        fetchProducts(debouncedProductSearch);
    }, [debouncedProductSearch, fetchProducts]);

    // Busca fornecedores ao abrir o modal (se necessário)
    useEffect(() => {
        const fetchSuppliers = async () => {
            if (open && suppliers.length === 0) {
                setLoadingSuppliers(true);
                try {
                    const response = await ApiService.getSuppliers();
                    setSuppliers(response.data || []);
                } catch (error) {
                    message.error('Erro ao buscar fornecedores.');
                } finally {
                    setLoadingSuppliers(false);
                }
            }
        };
        fetchSuppliers();
    }, [open, suppliers.length]);


    const handleOk = async () => {
        try {
            setLoading(true);
            const values = await form.validateFields();
            const payload = {
                product_id: values.product_id,
                quantity: Number(values.quantity),
                cost_price: values.cost_price !== undefined && values.cost_price !== null ? Number(values.cost_price) : null,
                supplier_id: values.supplier_id || null,
                notes: values.notes || null,
            };

            // TODO: Chamar o novo endpoint da API quando ele existir
            // await ApiService.createStockEntry(payload); // Exemplo de chamada
            console.log("Payload para API /stock/entries:", payload); // Log temporário
            message.success(`Entrada de ${payload.quantity} unidade(s) registrada (simulação)!`); // Mensagem temporária

            form.resetFields(); // Limpa o formulário
            onSuccess(); // Chama o callback de sucesso
        } catch (errorInfo) {
            console.error('Falha na validação ou API:', errorInfo);
             if (errorInfo.errorFields) {
                 message.error('Erro de validação. Verifique os campos.');
            } else {
                 message.error(errorInfo.response?.data?.detail || 'Falha ao registrar entrada de estoque.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCancelModal = () => {
        form.resetFields();
        setProducts([]); // Limpa a busca de produtos
        onCancel();
    };

    return (
        <Modal
            title="Registrar Entrada de Estoque"
            open={open}
            onCancel={handleCancelModal}
            onOk={handleOk}
            confirmLoading={loading}
            okText="Registrar Entrada"
            cancelText="Cancelar"
            destroyOnClose
            width={600}
        >
            <Form form={form} layout="vertical">
                <Form.Item
                    name="product_id"
                    label="Produto"
                    rules={[{ required: true, message: 'Selecione o produto!' }]}
                >
                    <Select
                        showSearch
                        placeholder="Digite para buscar o produto..."
                        onSearch={setProductSearch}
                        loading={loadingProducts}
                        filterOption={false} // A busca é feita pela API
                        notFoundContent={loadingProducts ? <Spin size="small" /> : (productSearch.length < 2 ? 'Digite ao menos 2 caracteres' : 'Nenhum produto encontrado')}
                        style={{ width: '100%' }}
                    >
                        {products.map(p => (
                            <Option key={p.id} value={p.id}>
                                {p.name} (Estoque atual: {p.stock})
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name="quantity"
                            label="Quantidade Recebida"
                            rules={[{ required: true, message: 'Informe a quantidade!' }, { type: 'number', min: 1, message: 'Quantidade deve ser maior que 0' }]}
                        >
                            <InputNumber style={{ width: '100%' }} prefix={<DropboxOutlined />} placeholder="Unidades" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="cost_price"
                            label="Custo Unitário (Opcional)"
                             rules={[{ type: 'number', min: 0, message: 'Custo não pode ser negativo' }]}
                        >
                            <InputNumber style={{ width: '100%' }} prefix={<DollarCircleOutlined />} placeholder="R$" precision={2} />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item
                    name="supplier_id"
                    label="Fornecedor (Opcional)"
                >
                    <Select
                        showSearch
                        placeholder="Selecione o fornecedor"
                        loading={loadingSuppliers}
                        allowClear
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        options={suppliers.map(s => ({ value: s.id, label: s.name }))}
                        style={{ width: '100%' }}
                    />
                </Form.Item>

                 <Form.Item
                    name="notes"
                    label="Observações / Nº Nota Fiscal (Opcional)"
                >
                    <Input.TextArea rows={2} prefix={<FileTextOutlined />} placeholder="Alguma informação adicional..." />
                </Form.Item>

            </Form>
        </Modal>
    );
};

export default StockEntryModal;