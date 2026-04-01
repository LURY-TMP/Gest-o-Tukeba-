import { StockEntry, Sale, Customer, User, AppSettings } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const getHeaders = () => {
  return {
    'Content-Type': 'application/json'
  };
};

const handleResponse = async (res: Response) => {
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `API error: ${res.status}`);
    }
    return data;
  } else {
    const text = await res.text();
    console.error('Non-JSON response received:', text.substring(0, 100));
    throw new Error(`API returned non-JSON response (${res.status}). Check if the API route exists and is working correctly.`);
  }
};

export const api = {
  // User
  getProfile: async () => {
    const res = await fetch(`${API_URL}/user/profile`, { headers: getHeaders() });
    return handleResponse(res);
  },
  updateSettings: async (settings: AppSettings) => {
    const res = await fetch(`${API_URL}/user/settings`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(settings)
    });
    return handleResponse(res);
  },

  // Stock
  getStock: async () => {
    const res = await fetch(`${API_URL}/stock`, { headers: getHeaders() });
    return handleResponse(res);
  },
  addStock: async (entry: Partial<StockEntry>) => {
    const res = await fetch(`${API_URL}/stock`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(entry)
    });
    return handleResponse(res);
  },
  updateStock: async (id: string, entry: Partial<StockEntry>) => {
    const res = await fetch(`${API_URL}/stock/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(entry)
    });
    return handleResponse(res);
  },
  deleteStock: async (id: string) => {
    const res = await fetch(`${API_URL}/stock/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Sales
  getSales: async () => {
    const res = await fetch(`${API_URL}/sales`, { headers: getHeaders() });
    return handleResponse(res);
  },
  addSale: async (sale: Partial<Sale>) => {
    const res = await fetch(`${API_URL}/sales`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(sale)
    });
    return handleResponse(res);
  },
  deleteSale: async (id: string) => {
    const res = await fetch(`${API_URL}/sales/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Customers
  getCustomers: async () => {
    const res = await fetch(`${API_URL}/customers`, { headers: getHeaders() });
    return handleResponse(res);
  },
  addCustomer: async (customer: Partial<Customer>) => {
    const res = await fetch(`${API_URL}/customers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(customer)
    });
    return handleResponse(res);
  },
  updateCustomer: async (id: string, customer: Partial<Customer>) => {
    const res = await fetch(`${API_URL}/customers/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(customer)
    });
    return handleResponse(res);
  },
  deleteCustomer: async (id: string) => {
    const res = await fetch(`${API_URL}/customers/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  }
};
