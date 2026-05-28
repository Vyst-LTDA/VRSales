import React, { useState } from 'react';
import { FloatButton, Modal, Form, Input, message, Upload, Button } from 'antd';
import { QuestionCircleOutlined, UploadOutlined } from '@ant-design/icons';
import ApiService from '../api/ApiService';

const getBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

const FeedbackButton = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fileList, setFileList] = useState([]);
    const [form] = Form.useForm();

    const handleUploadChange = ({ fileList: newFileList }) => {
        setFileList(newFileList);
    };

    const onFinish = async (values) => {
        setLoading(true);
        try {
            let imagesArray = [];
            
            // --- LOOP PARA CONVERTER TODAS AS IMAGENS ---
            if (fileList.length > 0) {
                for (let file of fileList) {
                    if (file.originFileObj) {
                        const base64 = await getBase64(file.originFileObj);
                        imagesArray.push(base64);
                    }
                }
            }

            const payload = {
                ...values,
                image_data: imagesArray.length > 0 ? imagesArray : null
            };

            await ApiService.createFeedback(payload);
            message.success('Chamado enviado com sucesso! Nossa equipe analisará em breve.');
            setIsModalVisible(false);
            form.resetFields();
            setFileList([]);
        } catch (error) {
            message.error('Erro ao enviar o chamado. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <FloatButton 
                icon={<QuestionCircleOutlined />} 
                type="primary" 
                style={{ right: 24, bottom: 24 }} 
                onClick={() => setIsModalVisible(true)}
                tooltip="Reportar um problema ou dar feedback"
            />
            
            <Modal
                title="Reportar Problema ou Sugestão"
                open={isModalVisible}
                onCancel={() => {
                    setIsModalVisible(false);
                    setFileList([]);
                }}
                okText="Enviar"
                cancelText="Cancelar"
                onOk={() => form.submit()}
                confirmLoading={loading}
            >
                <Form form={form} layout="vertical" onFinish={onFinish}>
                    <Form.Item 
                        name="subject" 
                        label="Assunto" 
                        rules={[{ required: true, message: 'Por favor, insira o assunto.' }]}
                    >
                        <Input placeholder="Ex: Problema ao fechar o caixa" />
                    </Form.Item>
                    <Form.Item 
                        name="description" 
                        label="Descrição" 
                        rules={[{ required: true, message: 'Por favor, descreva o problema.' }]}
                    >
                        <Input.TextArea rows={4} placeholder="Descreva com detalhes o que aconteceu..." />
                    </Form.Item>
                    
                    <Form.Item label="Anexar Imagens (Opcional - Máx. 5)">
                        <Upload
                            listType="picture"
                            multiple={true} // --- PERMITE SELECIONAR VÁRIOS ---
                            maxCount={5}    // --- LIMITE MÁXIMO DE ARQUIVOS ---
                            beforeUpload={() => false}
                            fileList={fileList}
                            onChange={handleUploadChange}
                            accept="image/*"
                        >
                            <Button icon={<UploadOutlined />}>Clique para anexar</Button>
                        </Upload>
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default FeedbackButton;