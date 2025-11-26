import React from 'react';
import { Input, Table, Button, Avatar, Tag, Tooltip, Empty, Spin, AutoComplete } from 'antd';
import { BarcodeOutlined, SearchOutlined, DeleteOutlined, ShoppingOutlined, PlusOutlined, MinusOutlined, WarningOutlined } from '@ant-design/icons';

const POSLeftPanel = ({ 
  cartItems, 
  lastAddedItem, 
  updateQuantity, 
  removeItem, 
  searchValue, 
  setSearchValue,
  autocompleteOptions,
  onSelectProduct,
  searchInputRef,
  searchLoading
}) => {
  
  const columns = [
    {
      title: 'Item', dataIndex: 'name', key: 'name',
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar shape="square" size={48} src={record.image_url} icon={<ShoppingOutlined />} style={{ background: '#E2E8F0' }} />
          <div>
             <div style={{ fontWeight: 600, color: '#1E293B' }}>{text}</div>
             <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{record.sku || 'Sem Cód.'}</div>
             {record.stock <= 5 && <Tag color="error" style={{fontSize: 10, marginTop: 2}}>Estoque: {record.stock}</Tag>}
          </div>
        </div>
      )
    },
    {
      title: 'Qtd', dataIndex: 'quantity', key: 'quantity', width: 140, align: 'center',
      render: (qty, record) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#F1F5F9', padding: '4px', borderRadius: 8 }}>
          <Button size="small" type="text" icon={<MinusOutlined />} onClick={() => updateQuantity(record.id, -1)} />
          <span style={{ fontWeight: 700, width: 24, textAlign: 'center' }}>{qty}</span>
          <Button size="small" type="text" icon={<PlusOutlined />} onClick={() => updateQuantity(record.id, 1)} />
        </div>
      )
    },
    {
      title: 'Unit.', dataIndex: 'price', key: 'price', width: 100, align: 'right',
      render: val => `R$ ${val.toFixed(2)}`
    },
    {
      title: 'Total', key: 'total', width: 120, align: 'right',
      render: (_, rec) => <span style={{ fontWeight: 700, color: '#4F46E5' }}>R$ {(rec.price * rec.quantity).toFixed(2)}</span>
    },
    {
        key: 'action', width: 50, align: 'center',
        render: (_, rec) => <Button danger type="text" icon={<DeleteOutlined />} onClick={() => removeItem(rec.id)} />
    }
  ];

  return (
    <div className="pos-left">
      {/* Barra de Busca Omnibox */}
      <div className="search-area">
         <AutoComplete
            options={autocompleteOptions}
            style={{ width: '100%' }}
            onSelect={(_, opt) => onSelectProduct(opt.productData)}
            onSearch={setSearchValue}
            value={searchValue}
            backfill
         >
            <Input
                ref={searchInputRef}
                className="pos-search-input"
                placeholder="Buscar produto, código de barras ou referência..."
                prefix={<BarcodeOutlined style={{ fontSize: 20, color: '#64748B', marginRight: 8 }} />}
                suffix={searchLoading ? <Spin size="small" /> : <SearchOutlined style={{ color: '#94A3B8' }} />}
                allowClear
                onPressEnter={() => {
                    if (autocompleteOptions.length > 0) onSelectProduct(autocompleteOptions[0].productData);
                }}
            />
         </AutoComplete>
      </div>

      {/* Lista de Itens */}
      <div className="product-list-container">
        <Table
          className="pos-table"
          columns={columns}
          dataSource={cartItems}
          rowKey="key"
          pagination={false}
          scroll={{ y: 'calc(100vh - 220px)' }}
          rowClassName={(record) => record.id === lastAddedItem?.id ? 'row-flash' : ''}
          locale={{ emptyText: <Empty description="Caixa Livre - Adicione itens" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </div>
    </div>
  );
};

export default POSLeftPanel;