import React, { useState } from 'react';
// Importações Reduzidas
import { Row, Col, Card, DatePicker, Typography, Button, message, Space, List, Spin } from 'antd';
import { motion } from 'framer-motion';
// Ícones necessários
import { FilePdfOutlined, CalendarOutlined, DownloadOutlined } from '@ant-design/icons';
import ApiService from '../api/ApiService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// Estilos (Podem ser simplificados)
const PageStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

    .reports-pdf-page-container {
      padding: 24px;
      background-color: #f0f2f5;
      font-family: 'Inter', sans-serif;
      min-height: 100vh;
    }

    .reports-header {
      /* ... estilo do header ... */
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding: 20px 24px;
      background: linear-gradient(135deg, #26A69A 0%, #007991 100%);
      border-radius: 16px;
      color: white;
      box-shadow: 0 10px 30px -10px rgba(0, 121, 145, 0.5);
    }

     .report-section {
        background: #fff;
        padding: 24px;
        border-radius: 12px;
        margin-bottom: 24px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
     }

     .report-section .ant-typography-title {
         margin-bottom: 20px;
         border-bottom: 1px solid #f0f0f0;
         padding-bottom: 10px;
     }

     .report-controls {
         display: flex;
         align-items: center;
         gap: 16px;
         flex-wrap: wrap;
         margin-bottom: 16px;
     }
  `}</style>
);

// --- Componente para a Secção de Relatório ---
const ReportSection = ({ title, children, onGeneratePdf, loading }) => (
    <Card className="report-section">
        <Title level={4}>{title}</Title>
        <div className="report-controls">
            {children} {/* Aqui entram os filtros (ex: RangePicker) */}
        </div>
        <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={onGeneratePdf}
            loading={loading}
            size="large"
        >
            Gerar PDF
        </Button>
    </Card>
);


const ReportsPagePdf = () => {
  const [loadingPdf, setLoadingPdf] = useState({ salesByPeriod: false, /* outros relatorios */ });
  const [salesDateRange, setSalesDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  // Adicionar estados para filtros de outros relatórios aqui (ex: selectedCustomer)

  // --- Função para descarregar o PDF ---
  const handleDownloadPdf = async (apiCall, reportName) => {
    setLoadingPdf(prev => ({ ...prev, [reportName]: true }));
    try {
      const response = await apiCall();

      if (response.data instanceof Blob) {
        const contentDisposition = response.headers['content-disposition'];
        let filename = `${reportName}_${dayjs().format('YYYYMMDD')}.pdf`; // Nome padrão

        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/); // Regex um pouco mais robusta
          if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1];
          }
        }
        filename = filename.replace(/[\s_]+$/, '').replace(/\.pdf[^.]*$/i, '') + '.pdf';

              // Cria uma URL temporária para o blob
              const url = window.URL.createObjectURL(new Blob([response.data]));
              // Cria um link temporário e clica nele para iniciar o download
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', filename);
              document.body.appendChild(link);
              link.click();
              // Limpa a URL e remove o link
              link.parentNode.removeChild(link);
              window.URL.revokeObjectURL(url);
              message.success(`Relatório "${reportName}" descarregado!`);
          } else {
               message.error(`Erro ao descarregar ${reportName}: Resposta inválida.`);
               console.error("Resposta inválida da API:", response);
          }
      } catch (error) {
           message.error(`Erro ao gerar ${reportName}: ${error.response?.data?.detail || error.message}`);
           console.error(`Erro ao gerar ${reportName}:`, error.response || error);
      } finally {
           // Remove o estado de loading específico
           setLoadingPdf(prev => ({ ...prev, [reportName]: false }));
      }
  };


  // --- Funções específicas para chamar o download de cada relatório ---
  const generateSalesPdf = () => {
      if (!salesDateRange || salesDateRange.length !== 2 || !salesDateRange[0] || !salesDateRange[1]) {
          message.warning("Selecione um intervalo de datas válido.");
          return;
      }
      const startDate = salesDateRange[0].format('YYYY-MM-DD');
      const endDate = salesDateRange[1].format('YYYY-MM-DD');
      handleDownloadPdf(() => ApiService.getSalesByPeriodPdf(startDate, endDate), 'VendasPorPeriodo');
  };

  // Adicionar outras funções generateXxxPdf aqui...


  return (
    <>
      <PageStyles />
      <motion.div className="reports-pdf-page-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="reports-header">
          <Title level={2} style={{ color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            <FilePdfOutlined /> Gerador de Relatórios PDF
          </Title>
        </div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
            {/* Secção para Relatório de Vendas por Período */}
            <ReportSection
                title="Vendas por Período"
                onGeneratePdf={generateSalesPdf}
                loading={loadingPdf.salesByPeriod}
            >
                <Space>
                    <CalendarOutlined style={{ fontSize: 18, color: '#555' }} />
                    <Text>Período:</Text>
                    <RangePicker
                        value={salesDateRange}
                        onChange={setSalesDateRange}
                        size="middle"
                        allowClear={false}
                    />
                </Space>
            </ReportSection>

            {/* Adicionar outras secções de Relatório aqui */}
            {/*
            <ReportSection title="Inventário de Stock" onGeneratePdf={generateStockPdf} loading={loadingPdf.stock}>
                 <Text>(Relatório de todo o stock atual)</Text>
            </ReportSection>

            <ReportSection title="Histórico do Cliente" onGeneratePdf={generateCustomerHistoryPdf} loading={loadingPdf.customerHistory}>
                 <Space>
                    <UserOutlined/>
                    <Text>Cliente:</Text>
                    <Select placeholder="Selecione um cliente..." style={{ width: 250 }}/> // Precisa de lógica para buscar/selecionar cliente
                 </Space>
            </ReportSection>
            */}

        </motion.div>
      </motion.div>
    </>
  );
};

export default ReportsPagePdf; // Renomeado para evitar conflito se necessário