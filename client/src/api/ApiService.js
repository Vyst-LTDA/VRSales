// client/src/api/ApiService.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercetor de REQUISIÇÃO: Adiciona o token a cada chamada
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Intercetor de RESPOSTA: Lida com erros
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // --- REMOÇÃO DO TRATAMENTO DE EXPIRAÇÃO (401) ---
    // O bloco 'if' que tratava o status 401 foi removido/comentado.
    /*
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('accessToken');
      delete apiClient.defaults.headers.common['Authorization'];
      if (!window.location.pathname.includes('/login')) {
        if (!sessionStorage.getItem('logout-message')) {
            sessionStorage.setItem('logout-message', 'true');
            alert('A sua sessão expirou. Por favor, faça login novamente.');
        }
        window.location.href = '/login';
      }
    }
    */
    // --- FIM DA REMOÇÃO ---

    // Outros erros ainda são rejeitados para serem tratados onde a chamada foi feita.
    return Promise.reject(error);
  }
);

// Agrupando todos os métodos da API em um único objeto
const ApiService = {
  // Funções genéricas
  get: (url, config) => apiClient.get(url, config),
  post: (url, data, config) => apiClient.post(url, data, config),
  put: (url, data, config) => apiClient.put(url, data, config),
  patch: (url, data, config) => apiClient.patch(url, data, config),
  delete: (url, config) => apiClient.delete(url, config),

  // Autenticação e Usuário
  login: (email, password) => {
    sessionStorage.removeItem('logout-message'); // Ainda pode ser útil limpar isso no login
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    return ApiService.post('/login/token', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },
  getCurrentUser: () => ApiService.get('/users/me'),

  // Walls
  getWalls: () => ApiService.get('/walls/'),
  createWall: (wallData) => ApiService.post('/walls/', wallData),
  updateWall: (wallId, wallData) => ApiService.put(`/walls/${wallId}`, wallData),
  deleteWall: (wallId) => ApiService.delete(`/walls/${wallId}`),
  updateWallsLayout: (layoutData) => ApiService.put('/walls/layout', layoutData),

  // Caixa
  getCashRegisterStatus: () => ApiService.get('/cash-registers/status'),
  openCashRegister: (data) => ApiService.post('/cash-registers/open', data),

  // Produtos
  getProducts: (params) => ApiService.get('/products/', { params }),
  lookupProduct: (barcodeOrName) => ApiService.get(`/products/lookup?q=${barcodeOrName}`),
  createProduct: (productData) => ApiService.post('/products/', productData),
  updateProduct: (productId, productData) => ApiService.put(`/products/${productId}`, productData),
  deleteProduct: (productId) => ApiService.delete(`/products/${productId}`),

  // Vendas (Sales) - para finalizar o pagamento
  createSale: (saleData) => ApiService.post('/sales/', saleData),

  // Comandas (Orders) - para a venda persistente no POS
  processPartialPayment: (orderId, paymentData) => ApiService.post(`/orders/${orderId}/pay`, paymentData),

  createOrder: (orderData) => ApiService.post('/orders/', orderData),
  getActivePosOrder: () => ApiService.get('/orders/pos/active'),
  addItemToOrder: (orderId, itemData) => ApiService.post(`/orders/${orderId}/items`, itemData),
  cancelOrder: (orderId) => ApiService.patch(`/orders/${orderId}/cancel`),
  closeOrder: (orderId) => ApiService.patch(`/orders/${orderId}/close`),
  updateOrderItem: (orderId, itemId, quantity) => ApiService.put(`/orders/${orderId}/items/${itemId}`, { quantity }),
  removeOrderItem: (orderId, itemId) => ApiService.delete(`/orders/${orderId}/items/${itemId}`),
  // Clientes
  getCustomers: (params) => ApiService.get('/customers/', { params }),
  createCustomer: (customerData) => ApiService.post('/customers/', customerData),
  // Adicione a função que faltava para buscar histórico do cliente
  getCustomerSalesHistory: (customerId) => ApiService.get(`/customers/${customerId}/sales`),

  getHeldOrders: () => ApiService.get('/orders/pos/held'),
  holdOrder: (orderId) => ApiService.patch(`/orders/${orderId}/hold`),
  resumeOrder: (orderId) => ApiService.patch(`/orders/${orderId}/resume`),
  // Outros...
  getStores: () => ApiService.get('/stores'),
  getGlobalDashboardSummary: () => ApiService.get('/super-admin/dashboard'),
  getDashboardSummary: () => ApiService.get('/reports/dashboard'),

  getTopSellingProducts: (limit = 10) => {
    return ApiService.get(`/reports/top-selling-products?limit=${limit}`);
  },
  getSalesEvolution: (startDate, endDate) => {
    return ApiService.get(`/reports/sales-evolution?start_date=${startDate}&end_date=${endDate}`);
  },
  getSalesByPeriodPdf: (startDate, endDate) => {
    return ApiService.get(`/reports/pdf/sales-by-period?start_date=${startDate}&end_date=${endDate}`, {
      responseType: 'blob',
    });
  },
   // Adicione as funções de usuário que faltavam (exemplo)
  createUser: (userData) => ApiService.post('/users/', userData),
  updateUser: (userId, userData) => ApiService.put(`/users/${userId}`, userData),
  deleteUser: (userId) => ApiService.delete(`/users/${userId}`), // Assumindo que a rota existe

  // Adicione as funções de fornecedor que faltavam (exemplo)
  getSuppliers: () => ApiService.get('/suppliers/'),
  createSupplier: (supplierData) => ApiService.post('/suppliers/', supplierData),
  updateSupplier: (supplierId, supplierData) => ApiService.put(`/suppliers/${supplierId}`, supplierData),
  deleteSupplier: (supplierId) => ApiService.delete(`/suppliers/${supplierId}`), // Assumindo que a rota existe
};

export default ApiService;