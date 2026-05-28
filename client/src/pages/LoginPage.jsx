import React, { useState } from 'react';
import { Form, Input, Button, message, Alert, Typography } from 'antd';
import { UserOutlined, LockOutlined, DesktopOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const { Title, Text } = Typography;

const PageStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    .login-container { display: flex; width: 100vw; height: 100vh; font-family: 'Inter', sans-serif; }
    .login-promo-panel { width: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 48px; text-align: center; }
    .promo-icon { font-size: 64px; margin-bottom: 24px; padding: 20px; background: rgba(255,255,255,0.1); border-radius: 50%; }
    .login-form-panel { width: 50%; display: flex; justify-content: center; align-items: center; background-color: #f0f2f5; }
    .login-form-wrapper { width: 100%; max-width: 400px; padding: 40px; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); }
    .login-form-title { text-align: center; margin-bottom: 32px; }
    .login-form-button { height: 48px; font-size: 16px; font-weight: 600; }
    @media (max-width: 768px) { .login-promo-panel { display: none; } .login-form-panel { width: 100%; } }
  `}</style>
);

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    setError('');
    try {
      const userData = await login(values.email, values.password);

      if (userData && userData.role) {
        message.success('Login bem-sucedido! Redirecionando...');
        if (userData.role === 'super_admin') {
          navigate('/global-dashboard');
        } else {
          navigate('/');
        }
      } else {
         throw new Error("Login bem-sucedido, mas não foi possível obter os dados.");
      }

    } catch (err) {
      // --- ALTERAÇÃO AQUI: Capturando a mensagem do backend ---
      const backendErrorMsg = err.response?.data?.detail;
      
      if (backendErrorMsg) {
        // Se for erro 403 da loja inativa, ou 400 de usuário inativo
        setError(backendErrorMsg);
      } else {
        // Fallback genérico para falha de rede
        setError('Email ou senha inválidos. Por favor, tente novamente.');
      }
      // --------------------------------------------------------
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageStyles />
      <div className="login-container">
        <motion.div 
          className="login-promo-panel"
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
        >
          <motion.div 
            className="promo-icon"
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <DesktopOutlined />
          </motion.div>
          <Title level={1} style={{ color: 'white', marginBottom: 16 }}>VR Sales</Title>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '18px' }}>
            A solução completa para a gestão do seu negócio.
          </Text>
        </motion.div>

        <div className="login-form-panel">
          <motion.div
            className="login-form-wrapper"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <div className="login-form-title">
              <Title level={2}>Acesse sua Conta</Title>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Alert message={error} type="error" showIcon closable onClose={() => setError('')} style={{ marginBottom: 24 }} />
              </motion.div>
            )}

            <Form name="login_form" onFinish={onFinish} size="large" layout="vertical">
              <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email', message: 'Por favor, insira um email válido!' }]}>
                <Input prefix={<UserOutlined />} placeholder="seuemail@exemplo.com" />
              </Form.Item>
              <Form.Item label="Senha" name="password" rules={[{ required: true, message: 'Por favor, insira a sua senha!' }]}>
                <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
              </Form.Item>
              <Form.Item><a style={{ float: 'right' }} href="">Esqueceu a senha?</a></Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" block loading={loading} className="login-form-button">
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
              </Form.Item>
            </Form>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;