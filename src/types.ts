export type StockType = '3P' | 'Meio' | 'Completa';

export interface StockEntry {
  id: string;
  date: string;
  brand: string;
  quantity: number;
  type: StockType;
  unitPrice: number;
  totalPrice: number;
  description?: string;
}

export interface Sale {
  id: string;
  date: string;
  brand: string;
  quantity: number;
  type: StockType;
  price: number;
  totalPrice: number;
  customerId: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  totalSpent: number;
  lastPurchaseDate?: string;
}

export interface Product {
  brand: string;
  type: StockType;
  stock: number;
  averageCost: number;
  price?: number;
  description?: string;
}

export interface DashboardStats {
  totalStock: number;
  dailySales: number;
  revenue: number;
  profit: number;
}

export interface AppSettings {
  currency: 'BRL' | 'USD' | 'EUR' | 'MZN' | 'KZ';
  language: 'pt' | 'en';
  lowStockThreshold: number;
}

export interface User {
  id: string;
  name: string;
  emailOrPhone: string;
  password?: string;
}
