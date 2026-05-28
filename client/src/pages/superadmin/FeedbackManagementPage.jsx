// client/src/pages/superadmin/FeedbackManagementPage.jsx
import React, { useState, useEffect } from 'react';
import { Table, Typography, Card, Tag, Button, message, Popconfirm, Image, Space } from 'antd';
import { BugOutlined, CheckCircleOutlined } from '@ant-design/icons';
import ApiService from '../../api/ApiService';

const { Title, Text } = Typography;

const FeedbackManagementPage = () => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchFeedbacks = async () => {
        try {
            setLoading(true);
            const response = await ApiService.getFeedbacks();
            setFeedbacks(response.data);
        } catch (error) {
            message.error('Erro ao carregar chamados.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeedbacks();
    }, []);

    const handleResolve = async (id) => {
        try {
            await ApiService.resolveFeedback(id);
            message.success('Chamado marcado como resolvido!');
            fetchFeedbacks();
        } catch (error) {
            message.error('Erro ao atualizar o chamado.');
        }
    };

    const columns = [
        {
            title: 'Data',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date) => new Date(date).toLocaleString('pt-BR'),
            width: 150,
        },
        {
            title: 'Loja',
            dataIndex: 'store_name',
            key: 'store_name',
            render: (text) => <Text strong>{text}</Text>,
        },
        {
            title: 'Usuário',
            dataIndex: 'user_name',
            key: 'user_name',
        },
        {
            title: 'Assunto',
            dataIndex: 'subject',
            key: 'subject',
            render: (text) => <Text strong>{text}</Text>,
        },
        {
            title: 'Descrição',
            dataIndex: 'description',
            key: 'description',
        },
        {
            title: 'Anexos',
            dataIndex: 'image_data',
            key: 'image_data',
            align: 'center',
            width: 150,
            render: (image_data) => {
                let images = [];
                if (image_data) {
                    try {
                        if (typeof image_data === 'string') {
                            images = JSON.parse(image_data);
                        } else {
                            images = image_data;
                        }
                        if (typeof images === 'string') {
                            images = [images];
                        }
                    } catch (e) {
                        images = [image_data];
                    }
                }

                return (Array.isArray(images) && images.length > 0) ? (
                    <Image.PreviewGroup>
                        <Space size={[8, 8]} wrap style={{ justifyContent: 'center' }}>
                            {images.map((img, index) => (
                                <Image 
                                    key={index} 
                                    src={img} 
                                    width={40} 
                                    height={40}
                                    style={{ borderRadius: 4, objectFit: 'cover' }} 
                                    preview={{ mask: '+' }} 
                                />
                            ))}
                        </Space>
                    </Image.PreviewGroup>
                ) : <Text type="secondary">-</Text>;
            },
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            align: 'center',
            render: (status) => (
                <Tag color={status === 'OPEN' ? 'error' : 'success'}>
                    {status === 'OPEN' ? 'EM ABERTO' : 'RESOLVIDO'}
                </Tag>
            ),
        },
        {
            title: 'Ações',
            key: 'actions',
            align: 'center',
            render: (_, record) => (
                record.status === 'OPEN' && (
                    <Popconfirm
                        title="Marcar este chamado como resolvido?"
                        onConfirm={() => handleResolve(record.id)}
                        okText="Sim"
                        cancelText="Não"
                    >
                        <Button type="primary" size="small" icon={<CheckCircleOutlined />} style={{ background: '#52c41a', borderColor: '#52c41a' }}>
                            Resolver
                        </Button>
                    </Popconfirm>
                )
            ),
        },
    ];

    return (
        <div style={{ padding: 24, backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, padding: '20px 24px', background: 'linear-gradient(135deg, #FF4B2B 0%, #FF416C 100%)', borderRadius: 16, color: 'white' }}>
                <BugOutlined style={{ fontSize: 28, marginRight: 16 }} />
                <Title level={2} style={{ color: 'white', margin: 0 }}>Gestão de Chamados</Title>
            </div>

            <Card style={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} styles={{ body: { padding: 0 } }}>
                <Table
                    columns={columns}
                    dataSource={feedbacks}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 15 }}
                />
            </Card>
        </div>
    );
};

export default FeedbackManagementPage;