// client/src/components/PartialPaymentModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Row, Col, Statistic, Select, InputNumber, Button, Form, message, Divider, Space, List, Avatar } from 'antd';
import { DollarCircleOutlined, CreditCardOutlined, QrcodeOutlined, CloseCircleOutlined } from '@ant-design/icons';
import ApiService from '../api/ApiService';

const { Option } = Select;

const PartialPaymentModal = ({ open, onCancel, onSuccess, orderId, itemsToPay, totalAmount, customerId }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([{ payment_method: 'cash', amount: 0 }]);

  // --- INÍCIO DA CORREÇÃO (Lógica de Arredondamento) ---

  // 1. Fonte da Verdade: Arredonda o total a ser pago vindo das props
  const totalToPay = useMemo(() => {
      return totalAmount > 0 ? parseFloat(totalAmount.toFixed(2)) : 0;
  }, [totalAmount]);

  // 2. Calcula o total pago pelos inputs, garantindo arredondamento na soma
  const totalPaid = useMemo(() => {
      const sum = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
      return parseFloat(sum.toFixed(2));
  }, [payments]);
  
  // 3. Calcula o restante e o troco com base nos valores arredondados
  const remainingAmount = parseFloat((totalToPay - totalPaid).toFixed(2));
  const change = totalPaid > totalToPay ? parseFloat((totalPaid - totalToPay).toFixed(2)) : 0;

  // --- FIM DA CORREÇÃO ---

  useEffect(() => {
    if (open) {
      // Usa o total arredondado para preencher o valor inicial
      const initialAmount = totalToPay;
      const initialPayments = [{ payment_method: 'cash', amount: initialAmount }];
      setPayments(initialPayments);
      form.setFieldsValue({ payments: initialPayments });
    }
  }, [open, totalToPay, form]);

  const handleFinishPayment = async (formValues) => {
    const finalPayments = formValues.payments.filter(p => p && p.amount > 0);
    // Recalcula para garantir segurança antes do envio
    const finalTotalPaid = parseFloat(finalPayments.reduce((acc, p) => acc + p.amount, 0).toFixed(2));

    // Validação com margem de segurança para float (embora o arredondamento acima deva bastar)
    if (finalTotalPaid < totalToPay - 0.001) {
      message.error('O valor pago é menor que o total dos itens selecionados.');
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        items_to_pay: itemsToPay.map(item => ({
          order_item_id: item.order_item_id,
          quantity: item.quantity,
        })),
        payments: finalPayments,
        customer_id: customerId,
      };
      
      await ApiService.processPartialPayment(orderId, payload);
      
      // Calcula troco final formatado
      const finalChange = finalTotalPaid - totalToPay;
      message.success(`Pagamento realizado com sucesso! Troco: R$ ${finalChange.toFixed(2).replace('.', ',')}`);
      onSuccess(); 
    } catch (error) {
        console.error("Erro detalhado no pagamento parcial:", error.response);
        const errorMsg = error.response?.data?.detail || 'Erro ao processar o pagamento.';
        message.error(errorMsg, 5);
    } finally {
        setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Pagamento Parcial de Itens"
      onCancel={onCancel}
      footer={null}
      width={800}
      destroyOnClose
    >
      <Row gutter={32}>
        <Col span={12}>
            <List
                header={<div><strong>Itens a Pagar</strong></div>}
                dataSource={itemsToPay}
                renderItem={item => (
                    <List.Item>
                        <List.Item.Meta
                            avatar={<Avatar>{item.quantity}x</Avatar>}
                            title={item.name}
                            description={`R$ ${item.price.toFixed(2)} (un)`}
                        />
                        <div>R$ {(item.price * item.quantity).toFixed(2)}</div>
                    </List.Item>
                )}
            />
             <Divider/>
            {/* Usa totalToPay arredondado para exibição */}
            <Statistic title="Total a Pagar" value={totalToPay} prefix="R$" precision={2} />
        </Col>
        <Col span={12}>
          <Statistic
            title={remainingAmount > 0 ? "Faltam" : "Troco"}
            value={remainingAmount > 0 ? remainingAmount : change}
            prefix="R$"
            precision={2}
            valueStyle={{ color: remainingAmount > 0 ? '#cf1322' : '#3f8600' }}
          />
          <Divider />
          
          <Form form={form} onFinish={handleFinishPayment} onValuesChange={(_, allValues) => setPayments(allValues.payments || [])}>
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
                        <InputNumber prefix="R$" style={{ width: 180 }} precision={2} min={0} />
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
              // Valida o botão usando o remainingAmount corrigido
              disabled={remainingAmount > 0}
              style={{ height: '50px', fontSize: '1.1rem' }}
            >
              Confirmar Pagamento
            </Button>
          </Form>
        </Col>
      </Row>
    </Modal>
  );
};

export default PartialPaymentModal;