import React from 'react';
import { Avatar, Typography, Tag, Space } from 'antd';
import { UserOutlined, WifiOutlined, ThunderboltFilled } from '@ant-design/icons';
import { useAuth } from '../../../context/AuthContext';

const { Text, Title } = Typography;

const POSHeader = ({ cashRegisterStatus }) => {
  const { user } = useAuth();
  const operatorName = user?.full_name || cashRegisterStatus?.user?.full_name || 'Operador';

  return (
    <div className="pos-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
         <div style={{ width: 40, height: 40, background: '#EEF2FF', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4F46E5' }}>
            <ThunderboltFilled style={{ fontSize: 24 }} />
         </div>
         <div>
           <Title level={5} style={{ margin: 0, color: '#1E293B' }}>VRSales PDV</Title>
           <Text type="secondary" style={{ fontSize: 11 }}>
             <WifiOutlined style={{ color: '#10B981', marginRight: 4 }} /> Online
           </Text>
         </div>
      </div>

      <Space size="large">
         <div style={{ textAlign: 'right' }}>
           <Text strong style={{ display: 'block', lineHeight: 1.2, color: '#334155' }}>{operatorName}</Text>
           <Tag color={cashRegisterStatus ? "green" : "red"} style={{margin: 0, fontSize: 10}}>
              {cashRegisterStatus ? `Caixa ${cashRegisterStatus.id} Aberto` : 'Caixa Fechado'}
           </Tag>
         </div>
         <Avatar size="large" icon={<UserOutlined />} style={{ backgroundColor: '#4F46E5' }} />
      </Space>
    </div>
  );
};

export default POSHeader;