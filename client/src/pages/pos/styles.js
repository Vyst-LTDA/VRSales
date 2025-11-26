export const posStyles = `
  :root {
    /* Paleta Slate & Indigo */
    --pos-bg-light: #F1F5F9;       /* Fundo Esquerdo */
    --pos-bg-dark: #0F172A;        /* Fundo Direito */
    --pos-accent: #4F46E5;         /* Indigo */
    --pos-accent-hover: #4338CA;
    --pos-success: #10B981;        /* Emerald */
    --pos-danger: #EF4444;         /* Red */
    --pos-warning: #F59E0B;        /* Amber */
    --pos-text-dark: #1E293B;
    --pos-text-light: #F8FAFC;
    --pos-border: #E2E8F0;
    --pos-card-bg: #FFFFFF;
  }

  .pos-container {
    display: flex;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    font-family: 'Inter', sans-serif;
  }

  /* Header */
  .pos-header {
    background: var(--pos-card-bg);
    height: 64px;
    border-bottom: 1px solid var(--pos-border);
    padding: 0 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }

  /* Left Panel (Light) */
  .pos-left {
    flex: 65; /* 65% width */
    background: var(--pos-bg-light);
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--pos-border);
    padding: 16px;
    overflow: hidden;
  }

  .search-area {
    margin-bottom: 16px;
  }
  
  .pos-search-input .ant-input-affix-wrapper {
    padding: 12px 16px;
    border-radius: 12px;
    border: 2px solid transparent;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    font-size: 1.1rem;
  }
  .pos-search-input .ant-input-affix-wrapper:focus-within {
    border-color: var(--pos-accent);
    box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.2);
  }

  .product-list-container {
    flex: 1;
    background: var(--pos-card-bg);
    border-radius: 12px;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* Right Panel (Dark) */
  .pos-right {
    flex: 35; /* 35% width */
    background: var(--pos-bg-dark);
    color: var(--pos-text-light);
    display: flex;
    flex-direction: column;
    padding: 24px;
    box-shadow: -4px 0 15px rgba(0,0,0,0.1);
  }

  /* Customer Card (Dark Theme) */
  .customer-card {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 24px;
  }

  /* Last Item Highlight */
  .last-item-highlight {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(255,255,255,0.03);
    border-radius: 16px;
    margin-bottom: 24px;
    padding: 20px;
    border: 1px dashed rgba(255,255,255,0.1);
  }
  
  .last-item-img {
    width: 140px; height: 140px;
    border-radius: 12px;
    object-fit: cover;
    border: 4px solid rgba(255,255,255,0.1);
    margin-bottom: 16px;
    background: #fff;
  }

  /* Payment Footer (Dark) */
  .payment-footer {
    margin-top: auto;
  }
  
  .total-display {
    text-align: right;
    margin-bottom: 24px;
  }
  .total-label {
    color: #94A3B8;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 600;
  }
  .total-amount {
    font-size: 4rem;
    font-weight: 800;
    color: var(--pos-success); /* Verde Neon */
    line-height: 1;
    letter-spacing: -2px;
  }

  /* Buttons */
  .btn-action-lg {
    height: 72px;
    border-radius: 12px;
    font-size: 1.25rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .btn-finish {
    background: var(--pos-success);
    border: none;
    color: #064E3B; /* Verde escuro para contraste */
  }
  .btn-finish:hover {
    background: #34D399 !important;
    color: #064E3B !important;
  }
  
  .btn-cancel {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: var(--pos-danger);
    font-size: 1rem;
  }
  .btn-cancel:hover {
    background: rgba(239, 68, 68, 0.2) !important;
    border-color: var(--pos-danger);
    color: #fff !important;
  }

  .kbd-key {
    background: rgba(0,0,0,0.2);
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 0.8rem;
    margin-right: 12px;
  }
  
  /* Table Overrides for POS */
  .pos-table .ant-table-thead > tr > th {
    background: #F8FAFC;
    color: #64748B;
    font-weight: 600;
  }
  .pos-table .ant-table-tbody > tr > td {
    padding: 12px 16px;
    font-size: 1rem;
  }
  .row-flash {
    animation: flash 1s;
  }
  @keyframes flash {
    0% { background-color: rgba(16, 185, 129, 0.2); }
    100% { background-color: transparent; }
  }
`;