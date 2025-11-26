import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, message, Spin, Typography, Empty, Modal, Form, Input, InputNumber, Select, Popconfirm, Tooltip, Space, Divider } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import {
    SaveOutlined, LayoutOutlined, PlusOutlined, UserOutlined,
    RotateRightOutlined, EditOutlined, DeleteOutlined, BorderOutlined, MinusOutlined, StopOutlined,
    ColumnWidthOutlined, // Ícone para Largura
    ColumnHeightOutlined, // Ícone para Altura
} from '@ant-design/icons';
import Draggable from 'react-draggable';
import ApiService from '../api/ApiService';
import { useNavigate } from 'react-router-dom'; // Importado useNavigate

const { Title, Text } = Typography;
const { Option } = Select;

// Estilos completos restaurados e com ajuste de cor nos botões
const PageStyles = () => (
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    .floorplan-page-container { padding: 24px; background-color: #f0f2f5; font-family: 'Inter', sans-serif; min-height: 100vh; display: flex; flex-direction: column; }
    .floorplan-header { margin-bottom: 24px; padding: 20px 24px; background: linear-gradient(135deg, #007BFF 0%, #00C6FF 100%); border-radius: 16px; color: white; box-shadow: 0 10px 20px -10px rgba(0, 123, 255, 0.5); }
    .header-content { display: flex; justify-content: space-between; align-items: center; }
    .floorplan-body { display: flex; gap: 24px; flex: 1; }
    .floorplan-toolbar { width: 200px; background: #fff; border-radius: 16px; padding: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .floorplan-canvas { position: relative; flex: 1; height: 75vh; border-radius: 16px; overflow: hidden; background-color: #1a202c; background-image: linear-gradient(rgba(0, 198, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 198, 255, 0.1) 1px, transparent 1px); background-size: 20px 20px; box-shadow: inset 0 0 20px rgba(0,0,0,0.4); }

    .draggable-wrapper {
        position: absolute;
        cursor: grab;
        /* Width/height aqui são cruciais para Draggable */
    }
    .draggable-wrapper:active { cursor: grabbing; z-index: 1000 !important; }

    .rotatable-container {
        width: 100%;
        height: 100%;
        transform-origin: center center;
        transition: transform 0.2s ease;
        position: relative; /* Para controles ficarem relativos a ele */
    }

    .table-visual {
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        background: #ffffff; color: #1a202c; box-shadow: 0 4px 15px rgba(0, 198, 255, 0.3);
        border: 2px solid rgba(0, 198, 255, 0.8); transition: box-shadow 0.2s ease; user-select: none;
        position: absolute; /* Preenche o rotatable-container */
        top: 0; left: 0; right: 0; bottom: 0;
    }
    .table-visual.rectangle { border-radius: 12px; }
    .table-visual.round { border-radius: 50%; }
    .table-number { font-size: 1.5rem; font-weight: 700; }
    .table-capacity { font-size: 0.9rem; color: #555; }
    .empty-canvas { display: flex; justify-content: center; align-items: center; height: 100%; color: white; }

    .structural-element {
        background: #4a5568;
        border: 2px solid #2d3748;
        width: 100%;
        height: 100%;
        display: flex; align-items: center; justify-content: center; color: white;
        cursor: grab; /* Cursor herdado do wrapper */
        box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
        user-select: none;
        position: absolute; /* Preenche o rotatable-container */
        top: 0; left: 0; right: 0; bottom: 0;
        transform-origin: center center; /* Mantido aqui para clareza */
        transition: transform 0.2s ease; /* Mantido aqui */
    }

    /* Removido :active daqui pois está no wrapper */
    /* .structural-element:active { ... } */

    .element-controls {
        position: absolute;
        top: -15px;
        right: -15px;
        display: flex;
        gap: 5px;
        opacity: 0;
        transition: opacity 0.2s;
        z-index: 10;
        pointer-events: none; /* Desabilita clique nos controles inicialmente */
    }

    /* Mostra controles quando o mouse está sobre o CONTAINER ROTACIONÁVEL */
    .rotatable-container:hover .element-controls {
        opacity: 1;
        pointer-events: auto; /* Habilita clique nos controles no hover */
    }

    /* Estilos dos botões de controle restaurados e ajustados */
    .element-control-button {
        background: white; border-radius: 50%; width: 24px; height: 24px;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 1px 4px rgba(0,0,0,0.2); cursor: pointer; border: 1px solid #ccc;
        color: rgba(0, 0, 0, 0.65); /* Cor padrão do ícone Ant Design */
        font-size: 14px; /* Tamanho do ícone */
    }
    .element-control-button:hover {
        background: #f0f0f0;
        color: #1890ff; /* Azul no hover */
    }
     .element-control-button.danger {
        color: #ff4d4f; /* Vermelho padrão Ant Design */
    }
     .element-control-button.danger:hover {
        background: #fff1f0;
        border-color: #ffccc7;
        color: #cf1322; /* Vermelho mais escuro no hover */
    }
  `}</style>
);

// Componente DraggableTable (com container interno)
const DraggableTable = ({ table, onStart, onStop, onRotate, onDoubleClick, onDelete }) => {
    const nodeRef = useRef(null);
    const handleRotateClick = (e) => { e.stopPropagation(); onRotate(table.id, 'table'); };
    const handleDeleteClick = (e) => { e.stopPropagation(); onDelete(table.id, 'table'); };
    const handleEditClick = (e) => { e.stopPropagation(); onDoubleClick(table, 'table'); };

    const wrapperStyle = {
        zIndex: 1,
        width: table.shape === 'round' ? '100px' : '120px',
        height: table.shape === 'round' ? '100px' : '80px',
    };

    return (
        // Key única para ajudar Draggable a recalcular limites
        <Draggable key={`draggable-table-${table.id}-${table.shape}`} bounds="parent" grid={[10, 10]} position={{ x: table.pos_x, y: table.pos_y }} onStart={() => onStart(table.id)} onStop={(e, data) => onStop(e, data, table.id, 'table')} nodeRef={nodeRef}>
            <div ref={nodeRef} className="draggable-wrapper" style={wrapperStyle} onDoubleClick={() => onDoubleClick(table, 'table')}>
                <div className="rotatable-container" style={{ transform: `rotate(${table.rotation || 0}deg)` }}>
                    <motion.div className={`table-visual ${table.shape || 'rectangle'}`} whileTap={{ scale: 1.1, cursor: 'grabbing', boxShadow: "0 0 30px rgba(0, 230, 255, 0.8)" }}>
                        <Text className="table-number">{table.number}</Text>
                        <Space className="table-capacity" size={4}> <UserOutlined /> <Text>{table.capacity || 4}</Text> </Space>
                        <div className="element-controls">
                            <Tooltip title="Rotacionar 45°"><div className="element-control-button" onClick={handleRotateClick}><RotateRightOutlined /></div></Tooltip>
                            <Tooltip title="Editar"><div className="element-control-button" onClick={handleEditClick}><EditOutlined /></div></Tooltip>
                            <Tooltip title="Excluir">
                                <Popconfirm title="Excluir?" onConfirm={handleDeleteClick} onCancel={(e) => e?.stopPropagation()} okText="Sim" cancelText="Não" placement="topRight">
                                    <div className="element-control-button danger" onClick={(e) => e.stopPropagation()}><DeleteOutlined /></div>
                                </Popconfirm>
                            </Tooltip>
                        </div>
                    </motion.div>
                </div>
            </div>
        </Draggable>
    );
};

// Componente DraggableWall (com container interno)
const DraggableWall = ({ wall, onStart, onStop, onRotate, onDoubleClick, onDelete }) => {
    const nodeRef = useRef(null);
    const handleRotateClick = (e) => { e.stopPropagation(); onRotate(wall.id, 'wall'); };
    const handleDeleteClick = (e) => { e.stopPropagation(); onDelete(wall.id, 'wall'); };
    const handleEditClick = (e) => { e.stopPropagation(); onDoubleClick(wall, 'wall'); };

    const wrapperStyle = { zIndex: 1, width: `${wall.width}px`, height: `${wall.height}px` };

    return (
        // Key única para ajudar Draggable a recalcular limites
        <Draggable key={`draggable-wall-${wall.id}-${wall.width}-${wall.height}`} bounds="parent" grid={[10, 10]} position={{ x: wall.pos_x, y: wall.pos_y }} onStart={() => onStart(wall.id)} onStop={(e, data) => onStop(e, data, wall.id, 'wall')} nodeRef={nodeRef}>
            <div ref={nodeRef} className="draggable-wrapper" style={wrapperStyle} onDoubleClick={() => onDoubleClick(wall, 'wall')}>
                <div className="rotatable-container" style={{ transform: `rotate(${wall.rotation || 0}deg)` }}>
                    <motion.div className="structural-element" whileTap={{ cursor: 'grabbing', boxShadow: "0 6px 15px rgba(0, 0, 0, 0.4)" }}>
                       <div className="element-controls">
                            <Tooltip title="Rotacionar 45°"><div className="element-control-button" onClick={handleRotateClick}><RotateRightOutlined /></div></Tooltip>
                            <Tooltip title="Editar Dimensões"><div className="element-control-button" onClick={handleEditClick}><EditOutlined /></div></Tooltip>
                            <Tooltip title="Excluir Parede">
                                <Popconfirm title="Excluir?" onConfirm={handleDeleteClick} onCancel={(e) => e?.stopPropagation()} okText="Sim" cancelText="Não" placement="topRight">
                                    <div className="element-control-button danger" onClick={(e) => e.stopPropagation()}><DeleteOutlined /></div>
                                </Popconfirm>
                            </Tooltip>
                        </div>
                    </motion.div>
                </div>
            </div>
        </Draggable>
    );
};

// --- Componente Principal da Página ---
const FloorPlanSettingsPage = () => {
    const [tables, setTables] = useState([]);
    const [walls, setWalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editingElement, setEditingElement] = useState(null);
    const [editingElementType, setEditingElementType] = useState(null);
    const [form] = Form.useForm();
    const navigate = useNavigate();

    // Função para buscar dados iniciais
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [tablesRes, wallsRes] = await Promise.all([
                ApiService.get('/tables/'),
                ApiService.getWalls() // Busca as paredes
            ]);
            // Define valores padrão se algum campo vier nulo da API
            setTables(tablesRes.data.map(t => ({
                ...t,
                pos_x: t.pos_x ?? 50, pos_y: t.pos_y ?? 50, rotation: t.rotation ?? 0,
                shape: t.shape || 'rectangle', capacity: t.capacity ?? 4
            })));
            setWalls(wallsRes.data.map(w => ({
                ...w,
                pos_x: w.pos_x ?? 100, pos_y: w.pos_y ?? 100, rotation: w.rotation ?? 0,
                width: w.width || 200, height: w.height || 10
            })));
        } catch (err){
            console.error("Erro ao carregar layout:", err);
            message.error('Erro ao carregar layout do salão.');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDragStart = useCallback(() => {}, []);

    const handleDragStop = useCallback((e, data, elementId, type) => {
        const updateFunc = type === 'table' ? setTables : setWalls;
        updateFunc(currentElements =>
            currentElements.map(el =>
                el.id === elementId ? { ...el, pos_x: Math.round(data.x), pos_y: Math.round(data.y) } : el
            )
        );
    }, []);

    const handleRotate = useCallback((elementId, type) => {
        const updateFunc = type === 'table' ? setTables : setWalls;
        updateFunc(currentElements =>
            currentElements.map(el =>
                el.id === elementId ? { ...el, rotation: ((el.rotation || 0) + 45) % 360 } : el
            )
        );
    }, []);

    // Função restaurada e corrigida para popular o modal
    const handleDoubleClick = useCallback((element, type) => {
        setEditingElement(element);
        setEditingElementType(type);
        // Usa setFieldsValue para preencher o form ANTES de abrir
        form.setFieldsValue({
            number: element.number,
            capacity: element.capacity ?? 4,
            shape: element.shape || 'rectangle',
            width: element.width || 200,
            height: element.height || 10
        });
        setIsEditModalVisible(true); // Abre o modal DEPOIS
    }, [form]);

    const handleModalCancel = useCallback(() => {
        setIsEditModalVisible(false);
        // Limpa estados DEPOIS que o modal fecha (ou imediatamente, não deve impactar)
        setEditingElement(null);
        setEditingElementType(null);
        form.resetFields(); // Limpa o formulário
    }, [form]);

    const handleEditModalOk = async () => {
         try {
            const values = await form.validateFields();
            const endpoint = editingElementType === 'table' ? `/tables/${editingElement.id}` : `/walls/${editingElement.id}`;
            const updateFunc = editingElementType === 'table' ? setTables : setWalls;
            const elementTypeMsg = editingElementType === 'table' ? 'Mesa' : 'Parede';

            const apiValues = { ...values };
            if (apiValues.capacity !== undefined) apiValues.capacity = Number(apiValues.capacity);
            if (apiValues.width !== undefined) apiValues.width = Number(apiValues.width);
            if (apiValues.height !== undefined) apiValues.height = Number(apiValues.height);

            // Atualiza estado local ANTES (Otimista)
            const updatedElementState = { ...editingElement, ...apiValues };
            updateFunc(prevElements => prevElements.map(el => el.id === editingElement.id ? updatedElementState : el));

            await ApiService.put(endpoint, apiValues); // Envia para API

            message.success(`${elementTypeMsg} atualizada.`);
            handleModalCancel(); // Fecha modal e limpa tudo no SUCESSO

        } catch (errorInfo) {
            console.error('Falha na validação ou API:', errorInfo);
            if (errorInfo.errorFields) {
                 message.error('Erro de validação. Verifique os campos.');
            } else {
                 message.error(errorInfo.response?.data?.detail || `Erro ao atualizar ${editingElementType === 'table' ? 'a mesa' : 'a parede'}.`);
                 fetchData(); // Recarrega para reverter otimismo
            }
             // Não fecha modal nem limpa em caso de erro
        }
    };

    const handleDeleteElement = async (elementId, type) => {
        const updateFunc = type === 'table' ? setTables : setWalls;
        const elementTypeMsg = type === 'table' ? 'Mesa' : 'Parede';
        try {
            updateFunc(prevElements => prevElements.filter(el => el.id !== elementId)); // Otimista
            if (type === 'table') await ApiService.delete(`/tables/${elementId}`);
            else await ApiService.deleteWall(elementId);
            message.success(`${elementTypeMsg} excluída com sucesso!`);
        } catch (error) {
            message.error(error.response?.data?.detail || `Erro ao excluir ${elementTypeMsg}.`);
            fetchData(); // Recarrega se a exclusão falhar
        }
    };

    const handleSaveLayout = async () => {
        setSaving(true);
        try {
            const tableLayoutData = { tables: tables.map(t => ({ id: t.id, pos_x: t.pos_x, pos_y: t.pos_y, rotation: t.rotation })) };
            const wallLayoutData = walls.map(w => ({ id: w.id, pos_x: w.pos_x, pos_y: w.pos_y, rotation: w.rotation }));
            await Promise.all([ ApiService.put('/tables/layout', tableLayoutData), ApiService.updateWallsLayout(wallLayoutData) ]);
            message.success('Layout do salão salvo com sucesso!');
        } catch (error) {
            console.error("Erro ao salvar layout:", error.response?.data || error); message.error('Erro ao salvar o layout.');
         } finally { setSaving(false); }
    };

    const addElement = async (type) => {
       try {
            let response;
            if (type === 'rectangle' || type === 'round') {
                const newTableData = { number: `Mesa ${tables.length + 1}`, shape: type, capacity: type === 'round' ? 4 : 6, pos_x: 50, pos_y: 50, rotation: 0 };
                response = await ApiService.post('/tables/', newTableData);
                setTables(prev => [...prev, { ...response.data, key: response.data.id }]);
                message.success(`Mesa ${response.data.number} adicionada!`);
            } else if (type === 'wall') {
                const newWallData = { pos_x: 100, pos_y: 100, width: 200, height: 10, rotation: 0 };
                response = await ApiService.createWall(newWallData);
                setWalls(prev => [...prev, { ...response.data, key: response.data.id }]);
                message.success(`Parede adicionada!`);
            }
        } catch (error) {
            console.error("Erro ao adicionar:", error.response?.data || error); message.error(`Erro ao adicionar ${type === 'wall' ? 'parede' : 'mesa'}.`);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Spin tip="Carregando layout..." size="large"><div style={{ padding: 50, borderRadius: 10 }} /></Spin>
            </div>
        );
    }

    // Função para renderizar o formulário correto no Modal (restaurada)
    const renderEditForm = () => {
        if (!editingElement || !editingElementType) return null;
        // Não precisa mais da key aqui se usarmos setFieldsValue antes de abrir
        // const formKey = `${editingElementType}-${editingElement.id}`;

        if (editingElementType === 'table') {
             return (
                 <Form form={form} layout="vertical" /*initialValues={editingElement} // Removido daqui */ >
                     <Form.Item name="number" label="Número/Nome" rules={[{ required: true, message: 'Número/Nome obrigatório' }]}>
                         <Input />
                     </Form.Item>
                     <Form.Item name="capacity" label="Capacidade (Lugares)" rules={[{ required: true, message: 'Capacidade obrigatória' }]}>
                         <InputNumber min={1} style={{ width: '100%' }} />
                     </Form.Item>
                     <Form.Item name="shape" label="Formato" rules={[{ required: true, message: 'Formato obrigatório' }]}>
                         <Select>
                             <Option value="rectangle">Retangular</Option>
                             <Option value="round">Redonda</Option>
                         </Select>
                     </Form.Item>
                 </Form>
             );
         } else if (editingElementType === 'wall') {
             return (
                 <Form form={form} layout="vertical" /*initialValues={editingElement} // Removido daqui */ >
                     <Form.Item name="width" label="Largura (px)" rules={[{ required: true, type: 'number', min: 10, message: 'Largura mínima 10px' }]}>
                         <InputNumber style={{ width: '100%' }} prefix={<ColumnWidthOutlined />} />
                     </Form.Item>
                     <Form.Item name="height" label="Espessura (px)" rules={[{ required: true, type: 'number', min: 5, message: 'Espessura mínima 5px' }]}>
                         <InputNumber style={{ width: '100%' }} prefix={<ColumnHeightOutlined />} />
                     </Form.Item>
                 </Form>
             );
         }
        return null;
    };


    return (
        <>
            <PageStyles />
            <motion.div className="floorplan-page-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                 <div className="floorplan-header">
                     <div className="header-content">
                        <Title level={2} style={{ margin: 0, color: 'white' }}><LayoutOutlined style={{ marginRight: 12 }} /> Editor de Layout do Salão</Title>
                        <Space>
                            <Button type="default" size="large" onClick={() => navigate('/tables')}>Voltar para Comandas</Button>
                            <Button type="primary" size="large" icon={<SaveOutlined />} loading={saving} onClick={handleSaveLayout}>Salvar Layout</Button>
                        </Space>
                    </div>
                 </div>

                <div className="floorplan-body">
                    <div className="floorplan-toolbar">
                        <Title level={5}>Mesas</Title>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Button icon={<BorderOutlined />} block onClick={() => addElement('rectangle')}>Mesa Retangular</Button>
                            <Button icon={<MinusOutlined />} block onClick={() => addElement('round')}>Mesa Redonda</Button>
                        </Space>
                        <Divider>Estrutura</Divider>
                         <Space direction="vertical" style={{ width: '100%' }}>
                            <Button icon={<StopOutlined />} block onClick={() => addElement('wall')}>Parede</Button>
                        </Space>
                    </div>

                    <div className="floorplan-canvas">
                        <AnimatePresence>
                             {tables.map(table => (
                                <DraggableTable
                                    key={`table-${table.id}`}
                                    table={table}
                                    onStart={handleDragStart}
                                    onStop={handleDragStop}
                                    onRotate={handleRotate}
                                    onDoubleClick={handleDoubleClick}
                                    onDelete={handleDeleteElement}
                                />
                            ))}
                            {walls.map(wall => (
                                <DraggableWall
                                    key={`wall-${wall.id}`}
                                    wall={wall}
                                    onStart={handleDragStart}
                                    onStop={handleDragStop}
                                    onRotate={handleRotate}
                                    onDoubleClick={handleDoubleClick}
                                    onDelete={handleDeleteElement}
                                />
                             ))}
                             {(tables.length === 0 && walls.length === 0) && (
                                <div className="empty-canvas">
                                    <Empty description={<span style={{ color: 'rgba(255,255,255,0.7)' }}>Use a barra de ferramentas para adicionar mesas ou paredes.</span>} />
                                </div>
                             )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>

            <Modal
                title={`Editar ${editingElementType === 'table' ? 'Mesa' : 'Parede'}`}
                open={isEditModalVisible}
                onCancel={handleModalCancel} // Usa a função de cancelamento que limpa tudo
                onOk={handleEditModalOk}
                destroyOnClose // Mantém
                // forceRender // Pode remover, setFieldsValue deve ser suficiente
            >
                 {/* Renderiza apenas se modal estiver aberto E houver elemento */}
                 {isEditModalVisible && editingElement && renderEditForm()}
            </Modal>
        </>
    );
};

export default FloorPlanSettingsPage;