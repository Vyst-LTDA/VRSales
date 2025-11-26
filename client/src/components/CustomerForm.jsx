import React, { useEffect } from 'react';
import { Form, Input, Button } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';

const CustomerForm = ({ form, customer, onFinish, onCancel }) => {

  useEffect(() => {
    if (customer) {
      form.setFieldsValue(customer);
    } else {
      form.resetFields();
    }
  }, [customer, form]);

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={customer}
    >
      <Form.Item
        name="full_name"
        label="Nome Completo"
        rules={[{ required: true, message: 'Por favor, insira o nome completo!' }]}
      >
        <Input prefix={<UserOutlined />} placeholder="Ex: João da Silva" size="large" />
      </Form.Item>
      <Form.Item
        name="email"
        label="E-mail"
        rules={[{ type: 'email', message: 'Por favor, insira um e-mail válido!' }]}
      >
        <Input prefix={<MailOutlined />} placeholder="Ex: joao.silva@email.com" size="large" />
      </Form.Item>
      <Form.Item
        name="phone_number"
        label="Telefone"
      >
        <Input prefix={<PhoneOutlined />} placeholder="Ex: (16) 99999-8888" size="large" />
      </Form.Item>

      <Form.Item style={{ textAlign: 'right', marginBottom: 0, marginTop: 24 }}>
        <Button onClick={onCancel} style={{ marginRight: 8 }} size="large">
          Cancelar
        </Button>
        <Button type="primary" htmlType="submit" size="large">
          {customer ? 'Salvar Alterações' : 'Adicionar Cliente'}
        </Button>
      </Form.Item>
    </Form>
  );
};

export default CustomerForm; 