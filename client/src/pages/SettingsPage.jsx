// client/src/pages/SettingsPage.jsx
import React, { useState } from 'react';
import { Typography, Card, Form, Input, Button, message, Divider } from 'antd';
import { LockOutlined, UserOutlined, SettingOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import ApiService from '../api/ApiService';

const { Title, Text } = Typography;

const SettingsPage = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    const onFinish = async (values) => {
        setLoading(true);
        try {
            await ApiService.changePassword({
                current_password: values.current_password,
                new_password: values.new_password
            });
            message.success('Senha atualizada com sucesso!');
            form.resetFields();
        } catch (error) {
            message.error(error.response?.data?.detail || 'Erro ao alterar a senha.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, padding: '20px 24px', background: 'linear-gradient(135deg, #182848 0%, #4b6cb7 100%)', borderRadius: 16, color: 'white' }}>
                <SettingOutlined style={{ fontSize: 28, marginRight: 16 }} />
                <Title level={2} style={{ color: 'white', margin: 0 }}>Configurações da Conta</Title>
            </div>

            <Card style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Title level={4}><UserOutlined /> Informações do Perfil</Title>
                <div style={{ marginBottom: 24, padding: 16, backgroundColor: '#f9f9f9', borderRadius: 8 }}>
                    <p><Text strong>Nome:</Text> {user?.full_name}</p>
                    <p><Text strong>Email:</Text> {user?.email}</p>
                    <p><Text strong>Nível de Acesso:</Text> {user?.role}</p>
                </div>

                <Divider />

                <Title level={4}><LockOutlined /> Alterar Senha</Title>
                <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 400 }}>
                    <Form.Item 
                        name="current_password" 
                        label="Senha Atual" 
                        rules={[{ required: true, message: 'Insira sua senha atual' }]}
                    >
                        <Input.Password placeholder="Sua senha atual" size="large" />
                    </Form.Item>

                    <Form.Item 
                        name="new_password" 
                        label="Nova Senha" 
                        rules={[
                            { required: true, message: 'Insira a nova senha' },
                            { min: 6, message: 'A senha deve ter pelo menos 6 caracteres' }
                        ]}
                    >
                        <Input.Password placeholder="Nova senha" size="large" />
                    </Form.Item>

                    <Form.Item 
                        name="confirm_password" 
                        label="Confirmar Nova Senha" 
                        dependencies={['new_password']}
                        rules={[
                            { required: true, message: 'Confirme a nova senha' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('new_password') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('As senhas não coincidem!'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password placeholder="Repita a nova senha" size="large" />
                    </Form.Item>

                    <Button type="primary" htmlType="submit" size="large" loading={loading} style={{ width: '100%' }}>
                        Atualizar Senha
                    </Button>
                </Form>
            </Card>
        </div>
    );
};

export default SettingsPage;