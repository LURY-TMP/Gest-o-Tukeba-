import { StockEntry, Sale, Customer, User, AppSettings } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const getHeaders = () => {
  return {
    'Content-Type': 'application/json'
  };
};

export const api = {
  // User
  getProfile: async () => {
    const res = await fetch(`${API_URL}/user/profile`, { headers: getHeaders() });
    return res.json();
  },
  updateSettings: async (settings: AppSettings) => {
    const res = await fetch(`${API_URL}/user/settings`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(settings)
    });
    return res.json();
  },

  // Stock
  getStock: async () => {
    const res = await fetch(`${API_URL}/stock`, { headers: getHeaders() });
    return res.json();
  },
  addStock: async (entry: Partial<StockEntry>) => {
    const res = await fetch(`${API_URL}/stock`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(entry)
    });
    return res.json();
  },
  updateStock: async (id: string, entry: Partial<StockEntry>) => {
    const res = await fetch(`${API_URL}/stock/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(entry)
    });
    return res.json();
  },
  deleteStock: async (id: string) => {
    const res = await fetch(`${API_URL}/stock/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return res.json();
  },

  // Sales
  getSales: async () => {
    const res = await fetch(`${API_URL}/sales`, { headers: getHeaders() });
    return res.json();
  },
  addSale: async (sale: Partial<Sale>) => {
    const res = await fetch(`${API_URL}/sales`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(sale)
    });
    return res.json();
  },
  deleteSale: async (id: string) => {
    const res = await fetch(`${API_URL}/sales/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return res.json();
  },

  // Customers
  getCustomers: async () => {
    const res = await fetch(`${API_URL}/customers`, { headers: getHeaders() });
    return res.json();
  },
  addCustomer: async (customer: Partial<Customer>) => {
    const res = await fetch(`${API_URL}/customers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(customer)
    });
    return res.json();
  },
  updateCustomer: async (id: string, customer: Partial<Customer>) => {
    const res = await fetch(`${API_URL}/customers/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(customer)
    });
    return res.json();
  },
  deleteCustomer: async (id: string) => {
    const res = await fetch(`${API_URL}/customers/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return res.json();
  }
};
