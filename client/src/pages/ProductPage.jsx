// client/src/pages/ProductPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Modal, message, Input, Tag, Card, Space, Typography, Spin, Popconfirm, Tooltip, Empty, Image, Form, Table, Row, Col, InputNumber } from 'antd';
import { motion } from 'framer-motion';
import {
    PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, AppstoreOutlined,
    HistoryOutlined, // Para histórico
    ToolOutlined, // Para ajuste de estoque
    BranchesOutlined, // Para variações
    BookOutlined, // Para receitas
    TruckOutlined // Para fornecedor
} from '@ant-design/icons';
import ApiService from '../api/ApiService';
// Importa o formulário de produto (separado ou in-line)
import ProductForm from '../components/ProductForm'; // Assumindo que está em components

const { Title, Text } = Typography;

// --- NOVO COMPONENTE: StockAdjustmentModal ---
const StockAdjustmentModal = ({ open, onCancel, onSuccess, product }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && product) {
            // Define o estoque atual no campo 'new_stock_level' como valor inicial
            form.setFieldsValue({ new_stock_level: product.stock });
        } else {
            form.resetFields();
        }
    }, [open, product, form]);

    const handleOk = async () => {
        try {
            setLoading(true);
            const values = await form.validateFields();
            const payload = {
                new_stock_level: Number(values.new_stock_level),
                reason: values.reason || 'Ajuste manual via interface', // Razão padrão
            };
            await ApiService.adjustStock(product.id, payload);
            message.success(`Estoque de "${product.name}" ajustado para ${payload.new_stock_level}!`);
            onSuccess(); // Chama o callback para fechar e recarregar
        } catch (error) {
            console.error("Erro ao ajustar estoque:", error.response?.data || error);
            message.error(error.response?.data?.detail || 'Falha ao ajustar o estoque.');
        } finally {
            setLoading(false);
        }
    };

    if (!product) return null;

    return (
        <Modal
            title={`Ajustar Estoque - ${product.name}`}
            open={open}
            onCancel={onCancel}
            onOk={handleOk}
            confirmLoading={loading}
            okText="Salvar Ajuste"
            cancelText="Cancelar"
            destroyOnClose
        >
            <Form form={form} layout="vertical">
                <Form.Item label="Estoque Atual">
                    <Input value={product.stock} disabled />
                </Form.Item>
                <Form.Item
                    name="new_stock_level"
                    label="Novo Nível de Estoque"
                    rules={[{ required: true, message: 'Informe o novo nível!' }]}
                >
                    <InputNumber style={{ width: '100%' }} placeholder="Quantidade total após o ajuste" />
                </Form.Item>
                 <Form.Item
                    name="reason"
                    label="Motivo do Ajuste (Opcional)"
                >
                    <Input.TextArea rows={2} placeholder="Ex: Contagem de inventário, Perda, etc." />
                </Form.Item>
            </Form>
        </Modal>
    );
};
// --- FIM StockAdjustmentModal ---


// Estilos (sem alterações funcionais)
const PageStyles = () => (
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    .product-page-container { padding: 24px; background-color: #f0f2f5; font-family: 'Inter', sans-serif; min-height: 100vh; }
    .product-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding: 20px 24px; background: linear-gradient(135deg, #27ae60 0%, #2980b9 100%); border-radius: 16px; color: white; box-shadow: 0 10px 30px -10px rgba(39, 174, 96, 0.5); }
    .controls-container { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding: 16px; background-color: #fff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .product-table-card { border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: none; overflow: hidden; }
    .product-table .ant-table-thead > tr > th { background-color: #fafafa; font-weight: 600; color: #333; }
    .product-table .ant-table-tbody > tr > td { border-bottom: 1px solid #f0f0f0; }
    .product-table .ant-table-tbody > tr:hover > td { background-color: #e6f7ff; }
    .stock-indicator { height: 6px; width: 80%; background-color: #e0e0e0; border-radius: 3px; }
    .stock-indicator-bar { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
    .product-form-buttons { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; }
    .ant-table-cell { vertical-align: top; } /* Alinha conteúdo da célula no topo */
  `}</style>
);


const ProductPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isProductModalVisible, setIsProductModalVisible] = useState(false); // Renomeado
    const [editingProduct, setEditingProduct] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [isStockModalVisible, setIsStockModalVisible] = useState(false); // Novo estado
    const [productToAdjust, setProductToAdjust] = useState(null); // Novo estado

    // --- fetchProducts (sem alterações funcionais) ---
    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const response = await ApiService.get('/products/', { params: { search: searchText } });
            setProducts(response.data);
        } catch (error) { message.error('Falha ao carregar os produtos.'); }
        finally { setLoading(false); }
    }, [searchText]);

    useEffect(() => {
        const handler = setTimeout(() => { fetchProducts(); }, 300);
        return () => { clearTimeout(handler); };
    }, [fetchProducts]);

    // --- Funções do Modal de Produto ---
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

     // --- Funções do Modal de Ajuste de Estoque ---
     const handleOpenStockModal = (product) => {
        setProductToAdjust(product);
        setIsStockModalVisible(true);
    };
     const handleCancelStockModal = () => {
        setIsStockModalVisible(false);
        setProductToAdjust(null);
    };
     const handleStockAdjustSuccess = () => {
        handleCancelStockModal(); // Fecha o modal
        fetchProducts(); // Recarrega a lista de produtos
    };

    // --- Função Delete (sem alterações funcionais) ---
    const handleDelete = async (productId) => {
        try {
            await ApiService.deleteProduct(productId);
            message.success('Produto excluído com sucesso!');
            fetchProducts();
        } catch (error) {
             console.error("Erro ao excluir produto:", error.response?.data || error);
             message.error(error.response?.data?.detail ||'Falha ao excluir o produto.');
        }
    };

    // --- Definição das Colunas da Tabela (Atualizada) ---
    const columns = [
        {
            title: 'Produto', dataIndex: 'name', key: 'name', width: '30%',
            render: (name, record) => (
                <Space direction="vertical" align="start">
                     <Space>
                        <Image width={40} height={40} src={record.image_url} fallback="https://via.placeholder.com/40/ecf0f1/bdc3c7?text=Sem+Img" style={{ objectFit: 'cover', borderRadius: 4 }} preview={false} />
                        <div>
                            <Text strong>{name}</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: '12px' }}>Cód: {record.barcode || 'N/A'}</Text>
                        </div>
                    </Space>
                    {/* Exibe Categoria e Fornecedor se existirem */}
                    <Space size="small" wrap>
                         {record.category && <Tag color="blue">{record.category.name}</Tag>}
                         {record.supplier && <Tag icon={<TruckOutlined />} color="cyan">{record.supplier.name}</Tag>}
                    </Space>
                </Space>
            )
        },
        {
            title: 'Preços (Venda/Custo)', dataIndex: 'price', key: 'prices', width: '15%',
            sorter: (a, b) => a.price - b.price,
            render: (price, record) => {
                const cost = record.cost_price;
                let margin = null;
                if (price > 0 && cost !== null && cost !== undefined && cost >= 0) {
                     margin = ((price - cost) / price) * 100;
                }
                return (
                    <div>
                        <Text strong>R$ {parseFloat(price || 0).toFixed(2).replace('.', ',')}</Text><br/>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            Custo: R$ {cost !== null && cost !== undefined ? parseFloat(cost).toFixed(2).replace('.', ',') : 'N/A'}
                        </Text><br/>
                        {margin !== null && (
                             <Text style={{ fontSize: '12px', color: margin < 0 ? '#ff4d4f' : '#52c41a' }}>
                                Margem: {margin.toFixed(1).replace('.', ',')}%
                             </Text>
                        )}
                    </div>
                );
            }
        },
        {
            title: 'Estoque', dataIndex: 'stock', key: 'stock', width: '20%',
            sorter: (a, b) => a.stock - b.stock,
            render: (stock, record) => {
                 const stockValue = stock ?? 0;
                 const threshold = record.low_stock_threshold ?? 10;
                 const stockStatus = stockValue <= threshold ? (stockValue <= 0 ? 'empty' : 'low') : 'ok';
                 const maxBarValue = threshold > 0 ? threshold * 2 : 20;
                 const stockPercentage = Math.min(Math.max(stockValue / maxBarValue, 0) * 100, 100);
                 let stockColor = '#2ecc71'; // ok
                 if (stockStatus === 'low') stockColor = '#f39c12'; // low
                 if (stockStatus === 'empty') stockColor = '#e74c3c'; // empty/negative

                return (
                    <div>
                        <Tag color={stockColor}>{stockValue} em estoque</Tag>
                        <Tooltip title={`Estoque: ${stockValue} / Mínimo: ${threshold}`}>
                            <div className="stock-indicator" style={{ marginTop: 4 }}>
                                <div className="stock-indicator-bar" style={{ width: `${stockPercentage}%`, background: stockColor }}></div>
                            </div>
                        </Tooltip>
                         {/* Botão de Ajuste de Estoque */}
                         <Button
                            type="link"
                            size="small"
                            icon={<ToolOutlined />}
                            onClick={() => handleOpenStockModal(record)}
                            style={{ marginLeft: 8, padding: 0 }}
                         >
                            Ajustar
                         </Button>
                    </div>
                )
            }
        },
        // TODO: Adicionar colunas para Categoria, Subcategoria, Fornecedor se necessário
        {
            title: 'Ações', key: 'actions', align: 'center', width: 120, // Aumentado para mais botões
            render: (_, record) => (
                <Space direction="vertical" align="center" size="small">
                    <Space>
                        <Tooltip title="Editar Produto"><Button size="small" shape="circle" icon={<EditOutlined />} onClick={() => handleOpenProductModal(record)} /></Tooltip>
                        <Popconfirm title="Tem certeza?" onConfirm={() => handleDelete(record.id)} okText="Sim" cancelText="Não">
                            <Tooltip title="Excluir"><Button size="small" shape="circle" danger icon={<DeleteOutlined />} /></Tooltip>
                        </Popconfirm>
                    </Space>
                    <Space>
                         {/* TODO: Botões condicionais para Variações, Receita, Histórico */}
                         {/* <Tooltip title="Gerenciar Variações"><Button size="small" shape="circle" icon={<BranchesOutlined />} disabled={record.product_type !== 'VARIATION_PARENT'} /></Tooltip> */}
                         {/* <Tooltip title="Gerenciar Receita"><Button size="small" shape="circle" icon={<BookOutlined />} disabled={record.product_type !== 'COMPOSED'} /></Tooltip> */}
                         {/* <Tooltip title="Histórico de Estoque"><Button size="small" shape="circle" icon={<HistoryOutlined />} /></Tooltip> */}
                    </Space>
                </Space>
            )
        },
    ];

    return (
        <>
            <PageStyles />
            <motion.div className="product-page-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="product-header">
                    <Title level={2} style={{ color: 'white', margin: 0 }}>
                        <AppstoreOutlined style={{ marginRight: 12 }} /> Gestão de Produtos
                    </Title>
                </div>

                <div className="controls-container">
                    <Input
                        placeholder="Buscar por nome ou código de barras..."
                        prefix={<SearchOutlined />}
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        style={{ maxWidth: 400 }}
                        size="large"
                        allowClear
                    />
                     {/* TODO: Adicionar Filtros de Categoria e Fornecedor aqui */}
                    <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => handleOpenProductModal()}>Novo Produto</Button>
                </div>

                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                    <Card className="product-table-card" bodyStyle={{ padding: 0 }}>
                        <Table
                            className="product-table"
                            columns={columns}
                            dataSource={products} // Usa diretamente os produtos da API
                            loading={loading}
                            rowKey="id"
                            pagination={{ pageSize: 15, showSizeChanger: true, pageSizeOptions: ['15', '30', '50', '100'] }} // Paginação melhorada
                            locale={{ emptyText: <Empty description={searchText ? "Nenhum produto encontrado para a busca." : "Nenhum produto cadastrado."} /> }}
                        />
                    </Card>
                </motion.div>

                {/* Modal para Criar/Editar Produto */}
                <Modal
                    title={editingProduct ? 'Editar Produto' : 'Adicionar Novo Produto'}
                    open={isProductModalVisible}
                    onCancel={handleCancelProductModal}
                    footer={null}
                    destroyOnClose
                    width={700} // Modal um pouco maior
                >
                    {isProductModalVisible && (
                        <ProductForm
                            product={editingProduct}
                            onSuccess={handleProductFormSuccess}
                            onCancel={handleCancelProductModal}
                        />
                    )}
                </Modal>

                 {/* Modal para Ajuste de Estoque */}
                 <StockAdjustmentModal
                    open={isStockModalVisible}
                    onCancel={handleCancelStockModal}
                    onSuccess={handleStockAdjustSuccess}
                    product={productToAdjust}
                 />

            </motion.div>
        </>
    );
};

export default ProductPage;