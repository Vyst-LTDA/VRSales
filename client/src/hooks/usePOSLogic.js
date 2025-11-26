import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { message } from 'antd';
import dayjs from 'dayjs';
import ApiService from '../api/ApiService';
import { useDebounce } from './useDebounce';

export const usePOSLogic = () => {
  const [cartItems, setCartItems] = useState([]);
  const [lastAddedItem, setLastAddedItem] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [cashRegisterStatus, setCashRegisterStatus] = useState(null);
  const [autocompleteOptions, setAutocompleteOptions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(dayjs().format('HH:mm'));

  const searchInputRef = useRef(null);
  const debouncedSearchValue = useDebounce(searchValue, 300);

  // Relógio
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(dayjs().format('HH:mm')), 1000);
    return () => clearInterval(timer);
  }, []);

  // Status do Caixa
  useEffect(() => {
    ApiService.getCashRegisterStatus()
      .then(res => setCashRegisterStatus(res.data))
      .catch(() => {}); 
  }, []);

  // Totais
  const { subtotal, totalItems } = useMemo(() => ({
    subtotal: cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0),
    totalItems: cartItems.reduce((acc, item) => acc + item.quantity, 0)
  }), [cartItems]);

  // Ações do Carrinho
  const addProductToCart = (product) => {
    setLastAddedItem(product);
    setCartItems(prev => {
      const exists = prev.find(i => i.id === product.id);
      if (exists) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [{ ...product, quantity: 1, key: product.id }, ...prev];
    });
    setSearchValue('');
    setAutocompleteOptions([]);
    searchInputRef.current?.focus();
    
    // Feedback sonoro opcional
    // new Audio('/beep.mp3').play().catch(() => {}); 
  };

  const updateQuantity = (id, delta) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(0, item.quantity + delta) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeItem = (id) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const clearSale = () => {
    setCartItems([]);
    setLastAddedItem(null);
    setSelectedCustomer(null);
    setSearchValue('');
  };

  // Busca de Produtos
  const fetchProducts = useCallback(async (term) => {
    if (!term || term.length < 2) {
        setAutocompleteOptions([]);
        return;
    }
    setSearchLoading(true);
    try {
      const response = await ApiService.get(`/products/?search=${term}&limit=10`);
      const options = (response.data || []).map(product => ({
        value: product.name,
        key: product.id,
        productData: product,
        label: product.name // Label simplificado para o autocomplete interno
      }));
      setAutocompleteOptions(options);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(debouncedSearchValue);
  }, [debouncedSearchValue, fetchProducts]);

  return {
    cartItems, lastAddedItem, searchValue, setSearchValue,
    isPaymentModalOpen, setIsPaymentModalOpen,
    selectedCustomer, setSelectedCustomer,
    cashRegisterStatus, autocompleteOptions, searchLoading,
    subtotal, totalItems, currentTime, searchInputRef,
    addProductToCart, updateQuantity, removeItem, clearSale,
  };
};