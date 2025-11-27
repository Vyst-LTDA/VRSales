import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Modal, message, Input, Tag, Card, Space, Typography, Popconfirm, Tooltip, Empty, Image, Form, Table, InputNumber, Segmented, Select, Divider } from 'antd';
import { motion } from 'framer-motion';
import {
    PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, AppstoreOutlined,
    ToolOutlined, TruckOutlined, ImportOutlined, FilterOutlined,
    CheckCircleOutlined, WarningOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import ApiService from '../api/ApiService';
import ProductForm from '../components/ProductForm';

const { Title, Text } = Typography;
const { Option } = Select;

// --- COMPONENTE: StockOperationModal (Mantido igual) ---
const StockOperationModal = ({ open, onCancel, onSuccess, product }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState('entry'); 
    const [currentStock, setCurrentStock] = useState(0);

    useEffect(() => {
        if (open && product) {
            setCurrentStock(Number(product.stock || 0));
            form.resetFields();
            form.setFieldsValue({ quantity: undefined, reason: '' });
            setMode('entry');
        }
    }, [open, product, form]);

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            let newStockLevel;
            let reasonPrefix = '';

            if (mode === 'entry') {
                const qtyToAdd = Number(values.quantity);
                newStockLevel = currentStock + qtyToAdd;
                reasonPrefix = `[ENTRADA] Adicionado ${qtyToAdd} un.`;
            } else {
                newStockLevel = Number(values.quantity);
                reasonPrefix = `[AJUSTE MANUAL] Estoque alterado de ${currentStock} para ${newStockLevel}.`;
            }

            const payload = {
                new_stock_level: newStockLevel,
                reason: `${reasonPrefix} ${values.reason ? `- ${values.reason}` : ''}`.trim(),
            };

            await ApiService.adjustStock(product.id, payload);
            
            message.success(mode === 'entry' ? 'Entrada realizada com sucesso!' : 'Estoque ajustado com sucesso!');
            onSuccess();
        } catch (error) {
            console.error("Erro na operação de estoque:", error);
            message.error('Falha ao atualizar o estoque.');
        } finally {
            setLoading(false);
        }
    };

    const quantityInput = Form.useWatch('quantity', form);
    const simulatedTotal = useMemo(() => {
        const val = Number(quantityInput || 0);
        return mode === 'entry' ? currentStock + val : val;
    }, [currentStock, quantityInput, mode]);

    if (!product) return null;

    return (
        <Modal
            title={
                <Space>
                    {mode === 'entry' ? <ImportOutlined style={{ color: '#2ecc71' }} /> : <ToolOutlined style={{ color: '#f39c12' }} />}
                    <span>{mode === 'entry' ? 'Entrada de Mercadoria' : 'Ajuste / Balanço'}</span>
                </Space>
            }
            open={open}
            onCancel={onCancel}
            onOk={handleOk}
            confirmLoading={loading}
            okText={mode === 'entry' ? "Confirmar Entrada" : "Salvar Ajuste"}
            okButtonProps={{ style: { backgroundColor: mode === 'entry' ? '#2ecc71' : undefined } }}
            destroyOnClose
        >
            <div style={{ marginBottom: 24, textAlign: 'center' }}>
                <Segmented
                    options={[
                        { label: 'Dar Entrada (+)', value: 'entry', icon: <ImportOutlined /> },
                        { label: 'Ajuste Manual (=)', value: 'set', icon: <ToolOutlined /> },
                    ]}
                    value={mode}
                    onChange={setMode}
                    block
                />
            </div>

            <div style={{ background: '#f9fafb', padding: 16, borderRadius: 8, marginBottom: 16, border: '1px solid #f0f0f0' }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Text type="secondary">Produto:</Text>
                    <Text strong>{product.name}</Text>
                </Space>
                <Divider style={{ margin: '8px 0' }} />
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Text type="secondary">Estoque Atual:</Text>
                    <Tag>{currentStock} un</Tag>
                </Space>
            </div>

            <Form form={form} layout="vertical">
                <Form.Item
                    name="quantity"
                    label={mode === 'entry' ? "Quantidade a Adicionar" : "Novo Estoque Total"}
                    rules={[{ required: true, message: 'Informe a quantidade!' }]}
                >
                    <InputNumber 
                        style={{ width: '100%' }} 
                        size="large" 
                        min={mode === 'entry' ? 1 : 0} 
                        placeholder={mode === 'entry' ? "Ex: 10" : "Ex: 50"}
                        autoFocus
                    />
                </Form.Item>

                <div style={{ marginBottom: 16, textAlign: 'right' }}>
                    <Text type="secondary" style={{ marginRight: 8 }}>Resultado Final:</Text>
                    <Text strong style={{ fontSize: 16, color: mode === 'entry' ? '#27ae60' : '#1890ff' }}>
                        {simulatedTotal} un
                    </Text>
                </div>

                <Form.Item name="reason" label="Observação / Nº da Nota (Opcional)">
                    <Input.TextArea rows={2} placeholder={mode === 'entry' ? "Ex: NF 1234, Compra Semanal" : "Ex: Contagem de fim de mês, Perda"} />
                </Form.Item>
            </Form>
        </Modal>
    );
};

const PageStyles = () => (
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    .product-page-container { padding: 24px; background-color: #f0f2f5; font-family: 'Inter', sans-serif; min-height: 100vh; }
    .product-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding: 20px 24px; background: linear-gradient(135deg, #27ae60 0%, #2980b9 100%); border-radius: 16px; color: white; box-shadow: 0 10px 30px -10px rgba(39, 174, 96, 0.5); }
    .controls-container { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding: 16px; background-color: #fff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); gap: 16px; flex-wrap: wrap; }
    .filters-area { display: flex; gap: 12px; flex: 1; align-items: center; }
    .product-table-card { border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: none; overflow: hidden; }
    .product-table .ant-table-thead > tr > th { background-color: #fafafa; font-weight: 600; color: #333; }
    .product-table .ant-table-tbody > tr > td { border-bottom: 1px solid #f0f0f0; }
    .product-table .ant-table-tbody > tr:hover > td { background-color: #e6f7ff; }
    /* Estilo da barra de estoque */
    .stock-indicator { height: 8px; width: 100%; background-color: #f0f0f0; border-radius: 4px; overflow: hidden; }
    .stock-indicator-bar { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
    .ant-table-cell { vertical-align: top; }
  `}</style>
);

const ProductPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isProductModalVisible, setIsProductModalVisible] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [categories, setCategories] = useState([]);
    
    const [isStockModalVisible, setIsStockModalVisible] = useState(false);
    const [productToAdjust, setProductToAdjust] = useState(null);

    // Carrega categorias para o filtro
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                // Tenta carregar do endpoint de lookup, ou usa fallback
                const res = await ApiService.get('/products/lookups/categories').catch(() => ({ data: [] })); 
                setCategories(res.data || []);
            } catch (err) { console.error("Erro ao carregar categorias", err); }
        };
        fetchCategories();
    }, []);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const params = { search: searchText };
            if (selectedCategory) params.category_id = selectedCategory;
            
            const response = await ApiService.get('/products/', { params });
            setProducts(response.data);
        } catch (error) { message.error('Falha ao carregar os produtos.'); }
        finally { setLoading(false); }
    }, [searchText, selectedCategory]);

    useEffect(() => {
        const handler = setTimeout(() => { fetchProducts(); }, 300);
        return () => { clearTimeout(handler); };
    }, [fetchProducts]);

    const handleOpenProductModal = (product = null) => {
        setEditingProduct(product);
        setIsProductModalVisible(true);
    };
    const handleCancelProductModal = () => {
        setIsProductModalVisible(false);
        setEditingProduct(null);
    };
    const handleProductFormSuccess = () => {
        message.success(`Produto ${editingProduct ? 'atualizado' : 'criado'} com sucesso!`);
        fetchProducts();
        handleCancelProductModal();
    };

    const handleOpenStockModal = (product) => {
        setProductToAdjust(product);
        setIsStockModalVisible(true);
    };
    const handleCancelStockModal = () => {
        setIsStockModalVisible(false);
        setProductToAdjust(null);
    };
    const handleStockAdjustSuccess = () => {
        handleCancelStockModal();
        fetchProducts();
    };

    const handleDelete = async (productId) => {
        try {
            await ApiService.deleteProduct(productId);
            message.success('Produto excluído com sucesso!');
            fetchProducts();
        } catch (error) {
             if (error.response && error.response.status === 409) {
                 Modal.warning({
                     title: 'Não é possível excluir',
                     content: error.response.data.detail || 'Este produto possui histórico de vendas.',
                     okText: 'Entendi'
                 });
             } else {
                 message.error('Falha ao excluir o produto.');
             }
        }
    };

    const columns = [
        {
            title: 'Produto', dataIndex: 'name', key: 'name', width: '30%',
            render: (name, record) => (
                <Space direction="vertical" align="start">
                     <Space>
                        <Image width={48} height={48} src={record.image_url} fallback="https://via.placeholder.com/48/ecf0f1/bdc3c7?text=Sem+Img" style={{ objectFit: 'cover', borderRadius: 6, border: '1px solid #f0f0f0' }} preview={false} />
                        <div>
                            <Text strong style={{fontSize: 15}}>{name}</Text>
                            <br />
                            <Space size={4}>
                                {record.barcode && <Tag icon={<AppstoreOutlined />} style={{fontSize: 11}}>{record.barcode}</Tag>}
                                <Text type="secondary" style={{ fontSize: '12px' }}>ID: {record.id}</Text>
                            </Space>
                        </div>
                    </Space>
                    <Space size="small" wrap>
                         {record.category && <Tag color="blue">{record.category.name}</Tag>}
                         {record.supplier && <Tag icon={<TruckOutlined />} color="cyan">{record.supplier.name}</Tag>}
                    </Space>
                </Space>
            )
        },
        {
            title: 'Preços', dataIndex: 'price', key: 'prices', width: '15%',
            sorter: (a, b) => a.price - b.price,
            render: (price, record) => (
                <div style={{ lineHeight: 1.3 }}>
                    <div><Text type="secondary" style={{fontSize: 12}}>Venda:</Text> <Text strong>R$ {parseFloat(price || 0).toFixed(2).replace('.', ',')}</Text></div>
                    {record.cost_price != null && (
                        <div><Text type="secondary" style={{fontSize: 12}}>Custo:</Text> <Text type="secondary">R$ {parseFloat(record.cost_price).toFixed(2).replace('.', ',')}</Text></div>
                    )}
                </div>
            )
        },
        {
            title: 'Estoque', dataIndex: 'stock', key: 'stock', width: '25%',
            sorter: (a, b) => a.stock - b.stock,
            render: (stock, record) => {
                 const stockValue = stock ?? 0;
                 const threshold = record.low_stock_threshold ?? 10;
                 
                 // CORREÇÃO DA LÓGICA DE STATUS
                 // Se for menor que o limite, é baixo. Se for igual ou maior, é OK.
                 const isLow = stockValue < threshold && stockValue > 0;
                 const isEmpty = stockValue <= 0;
                 const isOk = stockValue >= threshold;

                 // Cor da barra
                 let stockColor = '#2ecc71'; // Verde (OK)
                 if (isLow) stockColor = '#f39c12'; // Laranja (Baixo)
                 if (isEmpty) stockColor = '#e74c3c'; // Vermelho (Zerado)

                 // Lógica da Porcentagem da Barra
                 // Se estiver OK, a barra fica cheia (100%).
                 // Se estiver Baixo, a barra mostra proporcionalmente o quanto tem em relação ao mínimo.
                 let stockPercentage = 100;
                 if (isLow) {
                    // Ex: tem 5, minimo 10 -> barra 50% cheia e laranja
                    stockPercentage = (stockValue / threshold) * 100;
                 } else if (isEmpty) {
                    stockPercentage = 5; // Um tiquinho só pra mostrar que é vermelho
                 }

                return (
                    <div style={{ minWidth: 160 }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4}}>
                            <Text strong style={{ color: stockColor }}>{stockValue} un.</Text>
                            {(isLow || isEmpty) && <Tooltip title="Estoque Crítico"><WarningOutlined style={{color: stockColor}} /></Tooltip>}
                        </div>
                        
                        <Tooltip title={`Estoque Atual: ${stockValue} | Mínimo: ${threshold}`}>
                            <div className="stock-indicator">
                                <div className="stock-indicator-bar" style={{ width: `${stockPercentage}%`, background: stockColor }}></div>
                            </div>
                        </Tooltip>

                        <div style={{ marginTop: 8 }}>
                             <Button type="primary" ghost size="small" icon={<ImportOutlined />} onClick={() => handleOpenStockModal(record)} style={{fontSize: 12}}>Entrada / Ajuste</Button>
                        </div>
                    </div>
                )
            }
        },
        {
            title: 'Ações', key: 'actions', align: 'right', width: 100,
            render: (_, record) => (
                <Space direction="vertical" align="end">
                    <Tooltip title="Editar"><Button size="small" icon={<EditOutlined />} onClick={() => handleOpenProductModal(record)}>Editar</Button></Tooltip>
                    <Popconfirm title="Excluir?" description="Cuidado!" onConfirm={() => handleDelete(record.id)} okText="Sim" cancelText="Não">
                        <Button size="small" danger type="text" icon={<DeleteOutlined />}>Excluir</Button>
                    </Popconfirm>
                </Space>
            )
        },
    ];

    return (
        <>
            <PageStyles />
            <motion.div className="product-page-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="product-header">
                    <Title level={2} style={{ color: 'white', margin: 0 }}><AppstoreOutlined style={{ marginRight: 12 }} /> Produtos</Title>
                    <Button size="large" style={{background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none'}} icon={<CheckCircleOutlined />}>Inventário</Button>
                </div>

                <div className="controls-container">
                    <div className="filters-area">
                        <Input placeholder="Buscar..." prefix={<SearchOutlined style={{color: '#bfbfbf'}} />} value={searchText} onChange={e => setSearchText(e.target.value)} style={{ maxWidth: 350 }} size="large" allowClear />
                        <Select 
                            placeholder="Categoria" 
                            style={{width: 180}} 
                            allowClear 
                            onChange={setSelectedCategory} 
                            suffixIcon={<FilterOutlined />} 
                            size="large"
                            loading={categories.length === 0}
                        >
                            {categories.map(cat => (
                                <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                            ))}
                        </Select>
                    </div>
                    <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => handleOpenProductModal()}>Novo Produto</Button>
                </div>

                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                    <Card className="product-table-card" bodyStyle={{ padding: 0 }}>
                        <Table className="product-table" columns={columns} dataSource={products} loading={loading} rowKey="id" pagination={{ pageSize: 10 }} locale={{ emptyText: <Empty description="Nenhum produto." /> }} />
                    </Card>
                </motion.div>

                <Modal title={editingProduct ? 'Editar Produto' : 'Novo Produto'} open={isProductModalVisible} onCancel={handleCancelProductModal} footer={null} destroyOnClose width={700} style={{top: 20}}>
                    {isProductModalVisible && <ProductForm product={editingProduct} onSuccess={handleProductFormSuccess} onCancel={handleCancelProductModal} />}
                </Modal>

                 <StockOperationModal open={isStockModalVisible} onCancel={handleCancelStockModal} onSuccess={handleStockAdjustSuccess} product={productToAdjust} />
            </motion.div>
        </>
    );
};

export default ProductPage;