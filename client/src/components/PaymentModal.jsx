// client/src/components/PaymentModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Row, Col, Statistic, Select, InputNumber, Button, Form, message, Divider, Space, Typography } from 'antd';
import { DollarCircleOutlined, CreditCardOutlined, QrcodeOutlined, CloseCircleOutlined, TeamOutlined, CheckCircleOutlined } from '@ant-design/icons';
import ApiService from '../api/ApiService';

const { Option } = Select;
const { Text } = Typography;

// Adicionado orderId nas props para compatibilidade com o sistema de Pedidos
const PaymentModal = ({ open, onCancel, onOk, cartItems, totalAmount, customerId, orderId }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([{ payment_method: 'cash', amount: 0 }]);

  // 1. Cálculos de Totais (Fonte da Verdade)
  const totalToPay = useMemo(() => {
    return totalAmount > 0 ? parseFloat(totalAmount.toFixed(2)) : 0;
  }, [totalAmount]);

  const totalPaid = useMemo(() => {
    const sum = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
    return parseFloat(sum.toFixed(2));
  }, [payments]);

  const remainingAmount = parseFloat((totalToPay - totalPaid).toFixed(2));
  const change = totalPaid > totalToPay ? parseFloat((totalPaid - totalToPay).toFixed(2)) : 0;

  // 2. Inicializa o formulário quando abre
  useEffect(() => {
    if (open) {
      const initialAmount = totalAmount > 0 ? parseFloat(totalAmount.toFixed(2)) : 0;
      const initialPayments = [{ payment_method: 'cash', amount: initialAmount }];
      setPayments(initialPayments);
      form.setFieldsValue({ payments: initialPayments });
    }
  }, [open, totalAmount, form]);

  // 3. NOVO: Atalho F6 para confirmar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F6' && open) {
        e.preventDefault();
        
        // Só submete se não estiver carregando e o valor estiver pago
        if (!loading) {
            if (totalPaid >= totalToPay) {
                form.submit(); // Dispara o onFinish do formulário
            } else {
                message.warning('Valor pago insuficiente para finalizar.');
            }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, loading, totalPaid, totalToPay, form]);

  const handleFinishSale = async (formValues) => {
    const finalPayments = formValues.payments.filter(p => p && p.amount > 0);
    const finalTotalPaid = finalPayments.reduce((acc, p) => acc + p.amount, 0);

    if (finalTotalPaid < totalAmount) {
      message.error('O valor pago é menor que o total da venda.');
      return;
    }

    setLoading(true);
    try {
      // Monta o payload da venda
      const saleData = {
        items: cartItems,
        payments: finalPayments,
        customer_id: customerId,
        total_amount: totalAmount,
        // Se houver um pedido aberto associado (Active Order), enviamos o ID
        // para que o backend saiba que deve fechar essa comanda.
        order_id: orderId 
      };

      // Nota: Se você estiver usando a rota de criação de venda (/sales/), 
      // certifique-se que seu backend consome o 'order_id' para fechar a comanda, 
      // ou chame a rota de fechar pedido separadamente se necessário.
      // Por padrão, mantemos o post em /sales/ conforme seu código original.
      await ApiService.post('/sales/', saleData);

      const finalChange = finalTotalPaid - totalAmount;
      message.success({
        content: `Venda finalizada! Troco: R$ ${finalChange.toFixed(2).replace('.', ',')}`,
        duration: 5,
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />
      });
      
      onOk(); // Fecha o modal e limpa o carrinho no pai
    } catch (error) {
        console.error("Erro ao finalizar:", error.response);
        const errorMsg = error.response?.data?.detail || 'Erro ao finalizar a venda.';
        message.error(errorMsg, 5);
    } finally {
        setLoading(false);
    }
  };

  const handleSplitBill = (people) => {
    if (people < 2 || totalAmount <= 0) return;
    const amountPerPerson = parseFloat((totalAmount / people).toFixed(2));
    const newPayments = Array.from({ length: people }, (_, i) => ({
        payment_method: 'cash',
        amount: i === 0 ? totalAmount - (amountPerPerson * (people - 1)) : amountPerPerson,
    }));
    setPayments(newPayments);
    form.setFieldsValue({ payments: newPayments });
  };

  return (
    <Modal
      open={open}
      title="Finalizar Venda (F6 para Confirmar)" // Dica visual
      onCancel={onCancel}
      footer={null}
      width={800}
      destroyOnClose
      maskClosable={false} // Evita fechar clicando fora sem querer
    >
      <Row gutter={32}>
        <Col span={12}>
          <Statistic title="Total a Pagar" value={totalAmount} prefix="R$" precision={2} />
        </Col>
        <Col span={12}>
          <Statistic
            title={remainingAmount > 0 ? "Faltam" : "Troco"}
            value={remainingAmount > 0 ? remainingAmount : change}
            prefix="R$"
            precision={2}
            valueStyle={{ color: remainingAmount > 0 ? '#cf1322' : '#3f8600' }}
          />
        </Col>
      </Row>
      <Divider />

      <Space style={{ marginBottom: 24 }}>
          <Text><TeamOutlined /> Dividir conta:</Text>
          <Button onClick={() => handleSplitBill(2)}>2x</Button>
          <Button onClick={() => handleSplitBill(3)}>3x</Button>
          <Button onClick={() => handleSplitBill(4)}>4x</Button>
      </Space>

      <Form form={form} onFinish={handleFinishSale} onValuesChange={(_, allValues) => setPayments(allValues.payments || [])}>
        <Form.List name="payments">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                  <Form.Item {...restField} name={[name, 'payment_method']} initialValue="cash">
                    <Select style={{ width: 180 }}>
                      <Option value="cash"><DollarCircleOutlined /> Dinheiro</Option>
                      <Option value="credit_card"><CreditCardOutlined /> Crédito</Option>
                      <Option value="debit_card"><CreditCardOutlined /> Débito</Option>
                      <Option value="pix"><QrcodeOutlined /> PIX</Option>
                    </Select>
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'amount']}>
                    <InputNumber 
                        prefix="R$" 
                        style={{ width: 200 }} 
                        precision={2} 
                        min={0}
                        // Foca automaticamente no input de valor ao abrir (opcional, mas bom para agilidade)
                        autoFocus={key === 0} 
                    />
                  </Form.Item>
                  {fields.length > 1 ? <CloseCircleOutlined onClick={() => remove(name)} /> : null}
                </Space>
              ))}
              <Form.Item>
                <Button type="dashed" onClick={() => add({ payment_method: 'credit_card', amount: remainingAmount > 0 ? parseFloat(remainingAmount.toFixed(2)) : 0 })} block>
                  Adicionar outro pagamento
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>

        <Divider />

        <Button
          type="primary"
          htmlType="submit"
          size="large"
          loading={loading}
          block
          disabled={totalPaid < totalAmount}
          style={{ height: '60px', fontSize: '1.2rem', fontWeight: 'bold', backgroundColor: totalPaid >= totalAmount ? '#389e0d' : undefined }}
        >
          Confirmar (F6)
        </Button>
      </Form>
    </Modal>
  );
};

export default PaymentModal;