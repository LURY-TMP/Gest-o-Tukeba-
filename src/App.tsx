import React, { useState, useEffect, useMemo, Component } from 'react';
import { 
  LayoutDashboard, 
  PackagePlus, 
  ShoppingCart, 
  Users, 
  FileText, 
  Sparkles, 
  Plus, 
  Search, 
  TrendingUp, 
  Package, 
  DollarSign, 
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  Trash2,
  Download,
  History,
  Receipt,
  Check,
  Settings,
  Pencil,
  LogOut,
  Lock,
  MoreVertical,
  Mail,
  Phone,
  User as UserIcon,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, subDays, isSameDay, parseISO } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Toaster, toast } from 'sonner';
import { cn } from './lib/utils';
import { api } from './services/api';
import { StockEntry, Sale, Customer, Product, DashboardStats, StockType, AppSettings, User } from './types';
import { translations } from './translations';

// Error Boundary Component
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<any, any> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      try {
        const errorData = JSON.parse(this.state.error.message);
        errorMessage = `Erro no Firestore (${errorData.operationType}): ${errorData.error}`;
      } catch (e) {
        errorMessage = this.state.error.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
          <div className="apple-card p-8 max-w-md w-full text-center space-y-4">
            <AlertCircle className="text-red-500 w-16 h-16 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900">Ops! Algo deu errado</h2>
            <p className="text-gray-600">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="apple-button-primary w-full"
            >
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  BRL: 'R$',
  USD: '$',
  EUR: '€',
  MZN: 'MZN',
  KZ: 'Kz'
};

const TableActionMenu = ({ 
  onEdit, 
  onDelete, 
  t 
}: { 
  onEdit: () => void; 
  onDelete: () => void; 
  t: any 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 hover:bg-apple-gray-100 rounded-full transition-colors text-gray-500"
      >
        <MoreVertical size={20} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 mt-2 w-48 glass border border-apple-gray-100 rounded-2xl shadow-xl z-20 py-2 overflow-hidden"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-apple-gray-50 transition-colors"
              >
                <Pencil size={16} className="text-apple-blue" />
                {t.edit}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-apple-red hover:bg-red-50 transition-colors"
              >
                <Trash2 size={16} />
                {t.delete}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'stock' | 'sales' | 'customers' | 'reports' | 'settings'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>({
    id: 'default',
    name: 'Admin',
    emailOrPhone: 'tukebamartinspedrolury@gmail.com'
  });
  
  // State
  const [settings, setSettings] = useState<AppSettings>({ currency: 'MZN', language: 'pt', lowStockThreshold: 10 });
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const t = translations[settings.language];

  // Auth Listener
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await api.getProfile();
        if (userData) {
          setCurrentUser({
            id: userData._id,
            name: userData.name,
            emailOrPhone: userData.emailOrPhone
          });
          if (userData.settings) {
            setSettings(userData.settings);
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };
    checkAuth();
  }, []);

  // Data Fetching
  const fetchData = async () => {
    try {
      const [stockData, salesData, customersData] = await Promise.all([
        api.getStock(),
        api.getSales(),
        api.getCustomers()
      ]);
      setStockEntries(stockData);
      setSales(salesData);
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    const formattedValue = value.toLocaleString(settings.language === 'pt' ? 'pt-BR' : 'en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
    
    if (settings.currency === 'MZN') {
      return `${formattedValue} MZN`;
    }
    
    const symbol = CURRENCY_SYMBOLS[settings.currency] || CURRENCY_SYMBOLS.BRL;
    return `${symbol} ${formattedValue}`;
  };

  // Derived Data
  const products = useMemo(() => {
    const pMap = new Map<string, Product>();
    
    stockEntries.forEach(entry => {
      const key = `${entry.brand}-${entry.type}`;
      const existing = pMap.get(key) || { brand: entry.brand, type: entry.type, stock: 0, averageCost: 0, description: entry.description, price: entry.unitPrice };
      const totalCost = (existing.stock * existing.averageCost) + entry.totalPrice;
      existing.stock += entry.quantity;
      existing.averageCost = totalCost / existing.stock;
      if (entry.description) existing.description = entry.description;
      // Use the latest entry price as the current price
      existing.price = entry.unitPrice;
      pMap.set(key, existing);
    });

    sales.forEach(sale => {
      const key = `${sale.brand}-${sale.type}`;
      const existing = pMap.get(key);
      if (existing) {
        existing.stock -= sale.quantity;
        pMap.set(key, existing);
      }
    });

    return Array.from(pMap.values());
  }, [stockEntries, sales]);

  const stats = useMemo((): DashboardStats => {
    const today = startOfDay(new Date());
    const todaySales = sales.filter(s => isSameDay(parseISO(s.date), today));
    
    const revenue = todaySales.reduce((acc, s) => acc + s.totalPrice, 0);
    
    // Profit calculation (simplified: price - average cost)
    const profit = todaySales.reduce((acc, s) => {
      const product = products.find(p => p.brand === s.brand && p.type === s.type);
      const cost = product ? product.averageCost * s.quantity : 0;
      return acc + (s.totalPrice - cost);
    }, 0);

    return {
      totalStock: products.reduce((acc, p) => acc + p.stock, 0),
      dailySales: todaySales.length,
      revenue,
      profit
    };
  }, [sales, products]);

  // Components
  const Sidebar = () => (
    <div className={cn(
      "fixed inset-y-0 left-0 z-50 w-64 glass border-r border-apple-gray-100 transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col",
      isSidebarOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="p-8 flex-1">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-apple-blue rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <Sparkles className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">BebidaFlow</h1>
        </div>

        <nav className="space-y-2">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: t.dashboard },
            { id: 'stock', icon: PackagePlus, label: t.stock },
            { id: 'sales', icon: ShoppingCart, label: t.sales },
            { id: 'customers', icon: Users, label: t.customers },
            { id: 'reports', icon: FileText, label: t.reports },
            { id: 'settings', icon: Settings, label: t.settings },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as any);
                setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-200",
                activeTab === item.id 
                  ? "bg-apple-blue text-white shadow-md shadow-blue-100" 
                  : "text-gray-500 hover:bg-apple-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="p-8 space-y-6">
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
          <p className="text-xs font-semibold text-apple-blue uppercase tracking-wider mb-2">Assistente IA</p>
          <div className="space-y-2">
            <button className="w-full text-left text-sm text-blue-700 hover:underline flex items-center justify-between group">
              Sugestão de reposição
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="w-full text-left text-sm text-blue-700 hover:underline flex items-center justify-between group">
              Sugestão de preço
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {currentUser && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-apple-gray-50 border border-apple-gray-100">
            <div className="w-10 h-10 rounded-full bg-apple-blue/10 flex items-center justify-center text-apple-blue font-bold">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{currentUser.name}</p>
              <p className="text-xs text-gray-500 truncate">{currentUser.emailOrPhone}</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      <Toaster position="top-center" richColors />
      <Sidebar />
      
      {/* Overlay for mobile sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <main className="flex-1 lg:ml-64 p-4 md:p-8 lg:p-12">
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <div>
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 mb-4 text-gray-500 hover:text-gray-900"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              {activeTab === 'dashboard' && t.overview}
              {activeTab === 'stock' && t.stockEntries}
              {activeTab === 'sales' && t.salesRegistry}
              {activeTab === 'customers' && t.customerManagement}
              {activeTab === 'reports' && t.reportsAnalysis}
              {activeTab === 'settings' && t.settingsTitle}
            </h2>
            <p className="text-gray-500 mt-1">
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: settings.language === 'pt' ? ptBR : undefined })}
            </p>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar..." 
                className="pl-10 pr-4 py-2 rounded-full bg-white border border-apple-gray-100 outline-none focus:ring-2 focus:ring-apple-blue/20 transition-all"
              />
            </div>
            <div className="w-10 h-10 rounded-full bg-apple-gray-200 overflow-hidden border-2 border-white shadow-sm">
              <img src="https://picsum.photos/seed/user/100/100" alt="User" referrerPolicy="no-referrer" />
            </div>
          </div>
        </header>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && (
              <DashboardView stats={stats} products={products} sales={sales} t={t} formatCurrency={formatCurrency} settings={settings} />
            )}
            {activeTab === 'stock' && (
              <StockView 
                entries={stockEntries} 
                onAdd={async (e) => {
                  try {
                    const { id, ...data } = e;
                    await api.addStock(data);
                    await fetchData();
                    toast.success(t.entryAdded || 'Entrada adicionada!');
                  } catch (error) {
                    toast.error('Erro ao adicionar entrada');
                  }
                }} 
                onUpdate={async (e) => {
                  try {
                    const { id, ...data } = e;
                    await api.updateStock(id, data);
                    await fetchData();
                    toast.success(t.entryUpdated || 'Entrada atualizada!');
                  } catch (error) {
                    toast.error('Erro ao atualizar entrada');
                  }
                }}
                onDelete={async (id) => {
                  try {
                    await api.deleteStock(id);
                    await fetchData();
                    toast.success(t.entryDeleted || 'Entrada excluída!');
                  } catch (error) {
                    toast.error('Erro ao excluir entrada');
                  }
                }}
                t={t} 
                formatCurrency={formatCurrency} 
                settings={settings}
              />
            )}
            {activeTab === 'sales' && (
              <SalesView 
                sales={sales} 
                products={products} 
                customers={customers}
                stockEntries={stockEntries}
                onAdd={async (s) => {
                  try {
                    const { id, ...data } = s;
                    await api.addSale(data);
                    await fetchData();
                    toast.success(t.saleAdded || 'Venda registrada!');
                  } catch (error) {
                    toast.error('Erro ao registrar venda');
                  }
                }} 
                onUpdate={async (s) => {
                  try {
                    // Update not implemented in API yet, but we can add it if needed
                    // For now let's just use add/delete pattern or implement update
                    toast.info('Edição de venda não disponível no momento');
                  } catch (error) {
                    toast.error('Erro ao atualizar venda');
                  }
                }}
                onDelete={async (id) => {
                  try {
                    await api.deleteSale(id);
                    await fetchData();
                    toast.success(t.saleDeleted || 'Venda excluída!');
                  } catch (error) {
                    toast.error('Erro ao excluir venda');
                  }
                }}
                t={t}
                formatCurrency={formatCurrency}
                settings={settings}
              />
            )}
            {activeTab === 'customers' && (
              <CustomersView 
                customers={customers} 
                onAdd={async (c) => {
                  try {
                    const { id, ...data } = c;
                    await api.addCustomer(data);
                    await fetchData();
                    toast.success(t.customerAdded || 'Cliente adicionado!');
                  } catch (error) {
                    toast.error('Erro ao adicionar cliente');
                  }
                }}
                onUpdate={async (c) => {
                  try {
                    const { id, ...data } = c;
                    await api.updateCustomer(id, data);
                    await fetchData();
                    toast.success(t.customerUpdated || 'Cliente atualizado!');
                  } catch (error) {
                    toast.error('Erro ao atualizar cliente');
                  }
                }}
                onDelete={async (id) => {
                  try {
                    await api.deleteCustomer(id);
                    await fetchData();
                    toast.success(t.customerDeleted || 'Cliente excluído!');
                  } catch (error) {
                    toast.error('Erro ao excluir cliente');
                  }
                }}
                t={t}
                formatCurrency={formatCurrency}
              />
            )}
            {activeTab === 'reports' && (
              <ReportsView 
                sales={sales} 
                products={products} 
                customers={customers}
                t={t}
                formatCurrency={formatCurrency}
                settings={settings}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsView 
                settings={settings} 
                onUpdate={async (newSettings) => {
                  try {
                    if (currentUser) {
                      await api.updateSettings(newSettings);
                      setSettings(newSettings);
                      toast.success(t.settingsSaved || 'Configurações salvas!');
                    }
                  } catch (error) {
                    toast.error('Erro ao salvar configurações');
                  }
                }} 
                t={t} 
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- Sub-Views ---

function DashboardView({ stats, products, sales, t, formatCurrency, settings }: { stats: DashboardStats, products: Product[], sales: Sale[], t: any, formatCurrency: (v: number) => string, settings: AppSettings }) {
  const lowStockProducts = products.filter(p => p.stock < settings.lowStockThreshold);
  const [isMounted, setIsMounted] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: t.stockEmpty, color: 'text-red-600', bg: 'bg-red-50' };
    if (stock < 5) return { label: t.stockLow, color: 'text-orange-600', bg: 'bg-orange-50' };
    return { label: t.stockOk, color: 'text-green-600', bg: 'bg-green-50' };
  };
  
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(new Date(), 6 - i);
      const daySales = sales.filter(s => isSameDay(parseISO(s.date), date));
      return {
        name: format(date, 'dd/MM'),
        vendas: daySales.reduce((acc, s) => acc + s.totalPrice, 0)
      };
    });
    return last7Days;
  }, [sales]);

  const topProductsStockData = useMemo(() => {
    const salesMap = new Map<string, number>();
    sales.forEach(s => {
      salesMap.set(s.brand, (salesMap.get(s.brand) || 0) + s.quantity);
    });

    return Array.from(salesMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([brand]) => {
        const product = products.find(p => p.brand === brand);
        return {
          name: brand,
          estoque: product ? product.stock : 0
        };
      });
  }, [sales, products]);

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: t.totalStock, value: `${stats.totalStock} ${t.unit}`, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: t.dailySales, value: stats.dailySales, icon: ShoppingCart, color: 'text-green-600', bg: 'bg-green-50' },
          { label: t.revenue, value: formatCurrency(stats.revenue), icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: t.profit, value: formatCurrency(stats.profit), icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((stat, i) => (
          <div key={i} className="apple-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-3 rounded-2xl", stat.bg)}>
                <stat.icon className={stat.color} size={24} />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
            <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 apple-card p-8">
          <h3 className="text-lg font-bold mb-8">{t.salesPerformance}</h3>
          <div className="h-[300px] w-full relative">
            {isMounted && chartData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%" debounce={100}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#999', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#999', fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: '#F5F5F7' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                    formatter={(value: number) => [formatCurrency(value), t.revenue]}
                  />
                  <Bar dataKey="vendas" fill="#0071E3" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Alerts */}
        <div className="apple-card p-8">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <AlertCircle className="text-apple-red" size={20} />
            {t.lowStockAlert}
          </h3>
          <div className="space-y-4">
            {lowStockProducts.length > 0 ? (
              lowStockProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-red-50 border border-red-100">
                  <div>
                    <p className="font-bold text-gray-900">{p.brand}</p>
                    <p className="text-xs text-red-600 uppercase font-semibold">{p.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600">{p.stock}</p>
                    <p className="text-[10px] text-red-400 uppercase font-bold">{t.available}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="text-green-600" size={24} />
                </div>
                <p className="text-sm text-gray-500">{t.noEntriesRegistered}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stock Status Accordion */}
      <div className="apple-card p-8">
        <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
          <Package className="text-apple-blue" size={20} />
          {t.stockStatus}
        </h3>
        <div className="space-y-4">
          {products.length > 0 ? (
            products.map((product) => {
              const id = `${product.brand}-${product.type}`;
              const isExpanded = expandedId === id;
              const status = getStockStatus(product.stock);

              return (
                <div key={id} className="border border-apple-gray-100 rounded-2xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md">
                  <button 
                    onClick={() => setExpandedId(isExpanded ? null : id)}
                    className="w-full p-5 flex items-center justify-between hover:bg-apple-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn("p-2.5 rounded-xl", status.bg)}>
                        <Package className={status.color} size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{product.brand}</h4>
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{product.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">{product.stock}</p>
                        <p className="text-[9px] text-gray-400 uppercase font-bold tracking-widest">{t.totalStock}</p>
                      </div>
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="text-gray-400" size={20} />
                      </motion.div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-apple-gray-50/30 border-t border-apple-gray-100"
                      >
                        <div className="p-6 grid grid-cols-1 sm:grid-cols-4 gap-6">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.productName}</p>
                            <p className="text-sm font-bold text-gray-900">{product.brand} {product.type}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.currentStock}</p>
                            <p className="text-sm font-bold text-gray-900">{product.stock} {t.unit}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.price}</p>
                            <p className="text-sm font-bold text-apple-blue">{formatCurrency(product.price || 0)}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.status}</p>
                            <div>
                              <span className={cn(
                                "inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                status.bg,
                                status.color
                              )}>
                                {status.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <Package className="text-apple-gray-200 mx-auto mb-4" size={48} />
              <p className="text-gray-400 italic">{t.noEntriesRegistered}</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Products Stock Chart */}
      <div className="apple-card p-8">
        <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
          <Package className="text-apple-blue" size={20} />
          {t.topProductsStock}
        </h3>
        <div className="h-[300px] w-full relative">
          {isMounted && topProductsStockData.length > 0 && (
            <ResponsiveContainer width="100%" height="100%" debounce={100}>
              <BarChart data={topProductsStockData} layout="vertical" margin={{ left: 40, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F0F0F0" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#999', fontSize: 12 }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#999', fontSize: 12 }} width={100} />
                <Tooltip 
                  cursor={{ fill: '#F5F5F7' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                  formatter={(value: number) => [`${value} ${t.unit}`, t.totalStock]}
                />
                <Bar dataKey="estoque" fill="#34C759" radius={[0, 6, 6, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function StockView({ entries, onAdd, onUpdate, onDelete, t, formatCurrency, settings }: { entries: StockEntry[], onAdd: (e: StockEntry) => void, onUpdate: (e: StockEntry) => void, onDelete: (id: string) => void, t: any, formatCurrency: (v: number) => string, settings: AppSettings }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formData, setFormData] = useState({
    brand: '',
    quantity: '',
    type: 'Completa' as StockType,
    unitPrice: '',
    description: '',
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm")
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const quantity = Number(formData.quantity);
    const unitPrice = Number(formData.unitPrice);

    if (quantity <= 0) {
      setError(t.quantityGreaterThanZero);
      return;
    }
    if (unitPrice <= 0) {
      setError(t.priceGreaterThanZero);
      return;
    }

    const entryData: StockEntry = {
      id: editingId || Date.now().toString(),
      date: new Date(formData.date).toISOString(),
      brand: formData.brand,
      quantity,
      type: formData.type,
      unitPrice,
      totalPrice: quantity * unitPrice,
      description: formData.description
    };

    if (editingId) {
      onUpdate(entryData);
    } else {
      onAdd(entryData);
    }

    setFormData({ 
      brand: '', 
      quantity: '', 
      type: 'Completa', 
      unitPrice: '', 
      description: '', 
      date: format(new Date(), "yyyy-MM-dd'T'HH:mm") 
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (entry: StockEntry) => {
    setEditingId(entry.id);
    setFormData({
      brand: entry.brand,
      quantity: entry.quantity.toString(),
      type: entry.type,
      unitPrice: entry.unitPrice.toString(),
      description: entry.description || '',
      date: format(parseISO(entry.date), "yyyy-MM-dd'T'HH:mm")
    });
    setShowForm(true);
    setError(null);
  };

  const filteredEntries = useMemo(() => {
    return [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).filter(entry => {
      const entryDate = parseISO(entry.date);
      const start = startDate ? startOfDay(parseISO(startDate)) : null;
      const end = endDate ? endOfDay(parseISO(endDate)) : null;

      if (start && entryDate < start) return false;
      if (end && entryDate > end) return false;
      return true;
    });
  }, [entries, startDate, endDate]);

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button 
          onClick={() => { setShowForm(true); setError(null); }}
          className="apple-button-primary flex items-center gap-2"
        >
          <Plus size={20} />
          {t.newEntry}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="apple-card p-8 mb-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold">{editingId ? t.editEntry : t.stockEntries}</h3>
                <button onClick={() => { setShowForm(false); setError(null); setEditingId(null); }} className="text-gray-400 hover:text-gray-900">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500 ml-1">{t.date}</label>
                  <input 
                    required
                    type="datetime-local"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="apple-input" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500 ml-1">{t.brand}</label>
                  <input 
                    required
                    value={formData.brand}
                    onChange={e => setFormData({...formData, brand: e.target.value})}
                    placeholder="Ex: Heineken" 
                    className="apple-input" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500 ml-1">{t.type}</label>
                  <select 
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value as StockType})}
                    className="apple-input appearance-none"
                  >
                    <option value="Completa">Completa</option>
                    <option value="Meio">Meio</option>
                    <option value="3P">3P</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500 ml-1">{t.quantity}</label>
                  <input 
                    required
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={e => setFormData({...formData, quantity: e.target.value})}
                    placeholder="0" 
                    className="apple-input" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500 ml-1">{t.price} ({CURRENCY_SYMBOLS[settings.currency] || '$'})</label>
                  <input 
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.unitPrice}
                    onChange={e => setFormData({...formData, unitPrice: e.target.value})}
                    placeholder="0.00" 
                    className="apple-input" 
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-4 space-y-2">
                  <label className="text-sm font-medium text-gray-500 ml-1">{t.description}</label>
                  <input 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Ex: Lote especial, validade 12/26..." 
                    className="apple-input" 
                  />
                </div>
                <div className="lg:col-span-4 flex justify-end gap-4 mt-4">
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="flex items-center text-gray-500 font-medium">
                      {t.total}: {formatCurrency(Number(formData.quantity) * Number(formData.unitPrice))}
                    </div>
                    {error && (
                      <p className="text-xs font-bold text-apple-red mt-1 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {error}
                      </p>
                    )}
                  </div>
                  <button type="button" onClick={() => { setShowForm(false); setError(null); }} className="apple-button-secondary">{t.cancel}</button>
                  <button type="submit" className="apple-button-primary">{t.confirm}</button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="apple-card p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium text-gray-500 ml-1">{t.startDate}</label>
            <input 
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="apple-input" 
            />
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium text-gray-500 ml-1">{t.endDate}</label>
            <input 
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="apple-input" 
            />
          </div>
          <button 
            onClick={() => { setStartDate(''); setEndDate(''); }}
            className="apple-button-secondary h-[42px]"
          >
            {t.clearFilters}
          </button>
        </div>
      </div>

      <div className="apple-card overflow-hidden">
        <div className="p-6 border-b border-apple-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <History size={20} className="text-apple-blue" />
            {t.history}
          </h3>
          <span className="text-sm text-gray-500 font-medium">
            {filteredEntries.length} {t.stockEntries}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-apple-gray-50 border-b border-apple-gray-100">
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">{t.date}</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">{t.brand}</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">{t.type}</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">{t.quantity}</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">{t.average}</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">{t.total}</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-apple-gray-100">
              {filteredEntries.length > 0 ? (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-apple-gray-50/50 transition-colors">
                    <td className="px-8 py-5 text-sm text-gray-500">{format(parseISO(entry.date), 'dd/MM/yyyy HH:mm')}</td>
                    <td className="px-8 py-5 font-bold text-gray-900">{entry.brand}</td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider">
                        {entry.type}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm font-medium">{entry.quantity}</td>
                    <td className="px-8 py-5 text-sm text-gray-500">{formatCurrency(entry.unitPrice)}</td>
                    <td className="px-8 py-5 text-sm font-bold text-gray-900">{formatCurrency(entry.totalPrice)}</td>
                    <td className="px-8 py-5">
                      <TableActionMenu 
                        onEdit={() => handleEdit(entry)}
                        onDelete={() => {
                          if (window.confirm(t.confirmDeleteEntry)) {
                            onDelete(entry.id);
                          }
                        }}
                        t={t}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-8 py-12 text-center text-gray-400 italic">
                    {t.noEntriesRegistered}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SalesView({ sales, products, customers, stockEntries, onAdd, onUpdate, onDelete, t, formatCurrency, settings }: { sales: Sale[], products: Product[], customers: Customer[], stockEntries: StockEntry[], onAdd: (s: Sale) => void, onUpdate: (s: Sale) => void, onDelete: (id: string) => void, t: any, formatCurrency: (v: number) => string, settings: AppSettings }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmSale, setConfirmSale] = useState<Sale | null>(null);
  const [formData, setFormData] = useState({
    brand: '',
    quantity: '',
    type: 'Completa' as StockType,
    price: '',
    customerId: '',
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm")
  });

  const selectedProduct = products.find(p => p.brand === formData.brand && p.type === formData.type);

  const lastStockEntries = useMemo(() => {
    if (!formData.brand) return [];
    return stockEntries
      .filter(e => e.brand === formData.brand && e.type === formData.type)
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
      .slice(0, 3);
  }, [formData.brand, formData.type, stockEntries]);

  const lastSalesPrices = useMemo(() => {
    if (!formData.brand) return [];
    return sales
      .filter(s => s.brand === formData.brand && s.type === formData.type)
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
      .slice(0, 3);
  }, [formData.brand, formData.type, sales]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const quantity = Number(formData.quantity);
    const price = Number(formData.price);
    
    if (quantity <= 0) {
      setError(t.quantityGreaterThanZero);
      return;
    }
    if (price <= 0) {
      setError(t.priceGreaterThanZero);
      return;
    }

    if (selectedProduct && selectedProduct.stock < quantity && !editingId) {
      setError(t.insufficientStock);
      return;
    }

    const saleData: Sale = {
      id: editingId || Date.now().toString(),
      date: new Date(formData.date).toISOString(),
      brand: formData.brand,
      quantity,
      type: formData.type,
      price,
      totalPrice: quantity * price,
      customerId: formData.customerId
    };
    setConfirmSale(saleData);
  };

  const handleConfirmSale = () => {
    if (confirmSale) {
      if (editingId) {
        onUpdate(confirmSale);
      } else {
        onAdd(confirmSale);
      }
      toast.success(t.saleSuccess);
      setConfirmSale(null);
      setFormData({ 
        brand: '', 
        quantity: '', 
        type: 'Completa', 
        price: '', 
        customerId: '', 
        date: format(new Date(), "yyyy-MM-dd'T'HH:mm") 
      });
      setShowForm(false);
      setEditingId(null);
    }
  };

  const handleEdit = (sale: Sale) => {
    setEditingId(sale.id);
    setFormData({
      brand: sale.brand,
      quantity: sale.quantity.toString(),
      type: sale.type,
      price: sale.price.toString(),
      customerId: sale.customerId,
      date: format(parseISO(sale.date), "yyyy-MM-dd'T'HH:mm")
    });
    setShowForm(true);
    setError(null);
  };

  return (
    <div className="space-y-8">
      <AnimatePresence>
        {confirmSale && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmSale(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl overflow-hidden"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-apple-blue/10 rounded-full flex items-center justify-center mb-6">
                  <ShoppingCart className="text-apple-blue" size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-2">{t.confirmSale}</h3>
                <p className="text-gray-500 mb-8">{t.reviewSaleDetails}</p>
                
                <div className="w-full space-y-4 mb-8">
                  <div className="flex justify-between items-center p-4 rounded-2xl bg-apple-gray-50">
                    <span className="text-sm text-gray-500 font-medium">{t.product}</span>
                    <span className="font-bold">{confirmSale.brand} ({confirmSale.type})</span>
                  </div>
                  <div className="flex justify-between items-center p-4 rounded-2xl bg-apple-gray-50">
                    <span className="text-sm text-gray-500 font-medium">{t.quantity}</span>
                    <span className="font-bold">{confirmSale.quantity} {t.unit}</span>
                  </div>
                  {confirmSale.customerId && (
                    <div className="flex justify-between items-center p-4 rounded-2xl bg-apple-gray-50">
                      <span className="text-sm text-gray-500 font-medium">{t.customer}</span>
                      <span className="font-bold">
                        {customers.find(c => c.id === confirmSale.customerId)?.name || 'Cliente não encontrado'}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center p-4 rounded-2xl bg-apple-blue text-white">
                    <span className="text-sm font-medium opacity-80">{t.total}</span>
                    <span className="text-xl font-bold">{formatCurrency(confirmSale.totalPrice)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full">
                  <button 
                    onClick={() => setConfirmSale(null)}
                    className="apple-button-secondary py-4"
                  >
                    {t.cancel}
                  </button>
                  <button 
                    onClick={handleConfirmSale}
                    className="apple-button-primary py-4 flex items-center justify-center gap-2"
                  >
                    <Check size={20} />
                    {t.confirm}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex justify-end">
        <button 
          onClick={() => { setShowForm(true); setError(null); }}
          className="apple-button-primary flex items-center gap-2"
        >
          <Plus size={20} />
          {t.newSale}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="apple-card p-8 mb-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold">{editingId ? t.editSale : t.salesRegistry}</h3>
                <button onClick={() => { setShowForm(false); setError(null); setEditingId(null); }} className="text-gray-400 hover:text-gray-900">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500 ml-1">{t.date}</label>
                    <input 
                      required
                      type="datetime-local"
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                      className="apple-input" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500 ml-1">{t.product}</label>
                    <select 
                      required
                      value={formData.brand}
                      onChange={e => setFormData({...formData, brand: e.target.value})}
                      className="apple-input appearance-none"
                    >
                      <option value="">{t.selectProduct}</option>
                      {Array.from(new Set(products.map(p => p.brand))).map(brand => (
                        <option key={brand} value={brand}>{brand}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500 ml-1">{t.type}</label>
                    <select 
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value as StockType})}
                      className="apple-input appearance-none"
                    >
                      <option value="Completa">Completa</option>
                      <option value="Meio">Meio</option>
                      <option value="3P">3P</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500 ml-1">{t.customer}</label>
                    <select 
                      required
                      value={formData.customerId}
                      onChange={e => setFormData({...formData, customerId: e.target.value})}
                      className="apple-input appearance-none"
                    >
                      <option value="">{t.selectCustomer}</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500 ml-1">{t.quantity}</label>
                    <input 
                      required
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={e => setFormData({...formData, quantity: e.target.value})}
                      placeholder="0" 
                      className="apple-input" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500 ml-1">{t.price} ({CURRENCY_SYMBOLS[settings.currency] || '$'})</label>
                    <input 
                      required
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: e.target.value})}
                      placeholder="0.00" 
                      className="apple-input" 
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-4 mt-4">
                    <div className="flex-1 flex flex-col justify-center">
                      <p className="text-sm text-gray-500 font-medium">
                        {t.total}: {formatCurrency(Number(formData.quantity) * Number(formData.price))}
                      </p>
                      {selectedProduct && !error && (
                        <p className="text-xs font-bold text-apple-green">
                          {t.estimatedProfit}: {formatCurrency((Number(formData.price) - selectedProduct.averageCost) * Number(formData.quantity))}
                        </p>
                      )}
                      {error && (
                        <p className="text-xs font-bold text-apple-red mt-1 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {error}
                        </p>
                      )}
                    </div>
                    <button type="button" onClick={() => { setShowForm(false); setError(null); }} className="apple-button-secondary">{t.cancel}</button>
                    <button type="submit" className="apple-button-primary">{t.finalizeSale}</button>
                  </div>
                </div>

                {/* Product Details Side Panel */}
                <div className="lg:col-span-1 border-l border-apple-gray-100 pl-8 hidden lg:block">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">{t.product}</h4>
                  {selectedProduct ? (
                    <div className="space-y-6">
                      <div>
                        <p className="text-xs text-gray-400 font-bold uppercase mb-1">{t.available}</p>
                        <p className={cn(
                          "text-2xl font-bold",
                          selectedProduct.stock < 10 ? "text-apple-red" : "text-gray-900"
                        )}>
                          {selectedProduct.stock} <span className="text-sm font-medium text-gray-400">{t.unit}</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-bold uppercase mb-1">{t.averageCost}</p>
                        <p className="text-xl font-bold text-apple-blue">{formatCurrency(selectedProduct.averageCost)}</p>
                      </div>
                      {selectedProduct.description && (
                        <div>
                          <p className="text-xs text-gray-400 font-bold uppercase mb-1">{t.description}</p>
                          <p className="text-sm text-gray-600 leading-relaxed italic">"{selectedProduct.description}"</p>
                        </div>
                      )}
                      <div className="p-4 rounded-2xl bg-apple-gray-50 border border-apple-gray-100">
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">{t.estimatedProfit}</p>
                        <p className="text-sm font-bold text-apple-green">
                          + {formatCurrency(Number(formData.price) - selectedProduct.averageCost)} / {t.unit}
                        </p>
                      </div>

                      {/* Last Stock Entries */}
                      <div>
                        <p className="text-xs text-gray-400 font-bold uppercase mb-3 flex items-center gap-2">
                          <History size={14} />
                          {t.lastStockEntries}
                        </p>
                        <div className="space-y-2">
                          {lastStockEntries.length > 0 ? (
                            lastStockEntries.map((entry) => (
                              <div key={entry.id} className="flex justify-between items-center p-2 rounded-xl bg-white border border-apple-gray-100 shadow-sm">
                                <span className="text-[10px] font-medium text-gray-500">
                                  {format(parseISO(entry.date), 'dd/MM/yy')}
                                </span>
                                <span className="text-xs font-bold text-gray-900">
                                  {entry.quantity} <span className="text-[9px] text-gray-400">{t.unit}</span>
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-gray-400 italic">{t.noEntriesRegistered}</p>
                          )}
                        </div>
                      </div>

                      {/* Last Sales Prices */}
                      <div>
                        <p className="text-xs text-gray-400 font-bold uppercase mb-3 flex items-center gap-2">
                          <Receipt size={14} />
                          {t.lastSalesPrices}
                        </p>
                        <div className="space-y-2">
                          {lastSalesPrices.length > 0 ? (
                            lastSalesPrices.map((sale) => (
                              <div key={sale.id} className="flex justify-between items-center p-2 rounded-xl bg-white border border-apple-gray-100 shadow-sm">
                                <span className="text-[10px] font-medium text-gray-500">
                                  {format(parseISO(sale.date), 'dd/MM/yy')}
                                </span>
                                <span className="text-xs font-bold text-apple-blue">
                                  {formatCurrency(sale.price)}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-gray-400 italic">{t.noSalesRegistered}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Package className="text-apple-gray-200 mb-4" size={48} />
                      <p className="text-sm text-gray-400 italic">{t.selectProduct}</p>
                    </div>
                  )}
                </div>

                {/* Mobile Details */}
                {selectedProduct && (
                  <div className="lg:hidden p-4 rounded-2xl bg-apple-gray-50 border border-apple-gray-100 space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-gray-400 font-bold uppercase">{t.available}</p>
                      <p className="font-bold">{selectedProduct.stock} {t.unit}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-gray-400 font-bold uppercase">{t.averageCost}</p>
                      <p className="font-bold text-apple-blue">{formatCurrency(selectedProduct.averageCost)}</p>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-apple-gray-200">
                      <p className="text-xs text-gray-400 font-bold uppercase">{t.estimatedProfit}</p>
                      <p className="font-bold text-apple-green">{formatCurrency((Number(formData.price) - selectedProduct.averageCost) * Number(formData.quantity))}</p>
                    </div>
                    {lastStockEntries.length > 0 && (
                      <div className="pt-2 border-t border-apple-gray-200">
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">{t.lastStockEntries}</p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {lastStockEntries.map((entry) => (
                            <div key={entry.id} className="flex-shrink-0 px-3 py-1 rounded-lg bg-white border border-apple-gray-100 text-[10px]">
                              <span className="text-gray-400 mr-2">{format(parseISO(entry.date), 'dd/MM')}</span>
                              <span className="font-bold">{entry.quantity} {t.unit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {lastSalesPrices.length > 0 && (
                      <div className="pt-2 border-t border-apple-gray-200">
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">{t.lastSalesPrices}</p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {lastSalesPrices.map((sale) => (
                            <div key={sale.id} className="flex-shrink-0 px-3 py-1 rounded-lg bg-white border border-apple-gray-100 text-[10px]">
                              <span className="text-gray-400 mr-2">{format(parseISO(sale.date), 'dd/MM')}</span>
                              <span className="font-bold text-apple-blue">{formatCurrency(sale.price)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="apple-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-apple-gray-50 border-b border-apple-gray-100">
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">{t.date}</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">{t.customer}</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">{t.product}</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">{t.quantity}</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">{t.total}</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-apple-gray-100">
              {[...sales].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()).map((sale) => {
                const customer = customers.find(c => c.id === sale.customerId);
                return (
                  <tr key={sale.id} className="hover:bg-apple-gray-50/50 transition-colors">
                    <td className="px-8 py-5 text-sm text-gray-500">{format(parseISO(sale.date), 'dd/MM/yyyy HH:mm')}</td>
                    <td className="px-8 py-5 font-medium text-gray-900">{customer?.name || 'Consumidor Final'}</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{sale.brand}</span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase">{sale.type}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm font-medium">{sale.quantity}</td>
                    <td className="px-8 py-5 text-sm font-bold text-apple-green">{formatCurrency(sale.totalPrice)}</td>
                    <td className="px-8 py-5">
                      <TableActionMenu 
                        onEdit={() => handleEdit(sale)}
                        onDelete={() => {
                          if (window.confirm(t.confirmDeleteSale)) {
                            onDelete(sale.id);
                          }
                        }}
                        t={t}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CustomersView({ customers, onAdd, onUpdate, onDelete, t, formatCurrency }: { 
  customers: Customer[], 
  onAdd: (c: Customer) => void,
  onUpdate: (c: Customer) => void,
  onDelete: (id: string) => void,
  t: any,
  formatCurrency: (v: number) => string
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      onUpdate({ ...editingCustomer, ...formData });
    } else {
      onAdd({
        id: Date.now().toString(),
        ...formData,
        totalSpent: 0
      });
    }
    setFormData({ name: '', email: '', phone: '' });
    setEditingCustomer(null);
    setShowForm(false);
  };

  const handleEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({ name: c.name, email: c.email || '', phone: c.phone || '' });
    setShowForm(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button 
          onClick={() => {
            setEditingCustomer(null);
            setFormData({ name: '', email: '', phone: '' });
            setShowForm(true);
          }}
          className="apple-button-primary flex items-center gap-2"
        >
          <Plus size={20} />
          {t.newCustomer}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="apple-card p-8 mb-8">
              <h3 className="text-xl font-bold mb-8">{editingCustomer ? t.editCustomer : t.registerCustomer}</h3>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500 ml-1">{t.fullName}</label>
                  <input 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: João Silva" 
                    className="apple-input" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500 ml-1">{t.email}</label>
                  <input 
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    placeholder="joao@email.com" 
                    className="apple-input" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500 ml-1">{t.phone}</label>
                  <input 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    placeholder="(11) 99999-9999" 
                    className="apple-input" 
                  />
                </div>
                <div className="md:col-span-3 flex justify-end gap-4 mt-4">
                  <button type="button" onClick={() => setShowForm(false)} className="apple-button-secondary">{t.cancel}</button>
                  <button type="submit" className="apple-button-primary">
                    {editingCustomer ? t.saveChanges : t.registerCustomer}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers.map((customer) => (
          <div key={customer.id} className="apple-card p-6 group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-2xl bg-apple-gray-100 flex items-center justify-center text-xl font-bold text-apple-blue">
                {customer.name.charAt(0)}
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <TableActionMenu 
                  onEdit={() => handleEdit(customer)}
                  onDelete={() => setCustomerToDelete(customer)}
                  t={t}
                />
              </div>
            </div>
            <h4 className="text-lg font-bold text-gray-900">{customer.name}</h4>
            <div className="mb-4">
              <p className="text-sm text-gray-500">{customer.email || t.noEmail}</p>
              <p className="text-sm text-gray-500">{customer.phone || t.noPhone}</p>
            </div>
            
            <div className="pt-4 border-t border-apple-gray-50 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{t.totalSpent}</p>
                <p className="font-bold text-apple-green">{formatCurrency(customer.totalSpent)}</p>
              </div>
              {customer.lastPurchaseDate && (
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{t.lastPurchase}</p>
                  <p className="text-xs font-medium">{format(parseISO(customer.lastPurchaseDate), 'dd/MM/yy')}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {customerToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCustomerToDelete(null)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="apple-card p-8 max-w-md w-full relative z-10 shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-6 text-apple-red">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{t.confirmDelete}</h3>
                  <p className="text-sm text-gray-500">{t.actionCannotBeUndone}</p>
                </div>
              </div>
              
              <p className="text-gray-600 mb-8">
                {t.confirmDeleteCustomer} <span className="font-bold text-gray-900">{customerToDelete.name}</span>? {t.allDataRemoved}
              </p>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setCustomerToDelete(null)}
                  className="apple-button-secondary"
                >
                  {t.cancel}
                </button>
                <button 
                  onClick={() => {
                    onDelete(customerToDelete.id);
                    setCustomerToDelete(null);
                  }}
                  className="apple-button-primary bg-apple-red hover:bg-red-600 border-none"
                >
                  {t.deleteCustomer}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingsView({ settings, onUpdate, t }: { settings: AppSettings, onUpdate: (s: AppSettings) => void, t: any }) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="apple-card p-8 md:p-12">
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{t.settingsTitle}</h3>
          <p className="text-gray-500">{t.settingsSubtitle}</p>
        </div>

        <div className="space-y-12">
          {/* Currency Settings */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-apple-blue/10 rounded-xl flex items-center justify-center">
                <DollarSign className="text-apple-blue" size={20} />
              </div>
              <h4 className="text-lg font-bold text-gray-900">{t.currencySettings}</h4>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { id: 'BRL', label: 'Real (R$)', symbol: 'R$' },
                { id: 'USD', label: 'Dollar ($)', symbol: '$' },
                { id: 'EUR', label: 'Euro (€)', symbol: '€' },
                { id: 'MZN', label: 'Metical (MZN)', symbol: 'MZN' },
                { id: 'KZ', label: 'Kwanza (Kz)', symbol: 'Kz' },
              ].map((currency) => (
                <button
                  key={currency.id}
                  onClick={() => onUpdate({ ...settings, currency: currency.id as any })}
                  className={cn(
                    "p-6 rounded-3xl border-2 transition-all text-left group",
                    settings.currency === currency.id 
                      ? "border-apple-blue bg-apple-blue/5" 
                      : "border-apple-gray-100 hover:border-apple-gray-200 bg-white"
                  )}
                >
                  <p className={cn(
                    "text-xs font-bold uppercase tracking-wider mb-2",
                    settings.currency === currency.id ? "text-apple-blue" : "text-gray-400"
                  )}>
                    {currency.id}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">{currency.label}</span>
                    <span className={cn(
                      "text-2xl font-bold",
                      settings.currency === currency.id ? "text-apple-blue" : "text-apple-gray-200"
                    )}>
                      {currency.symbol}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Language Settings */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-apple-blue/10 rounded-xl flex items-center justify-center">
                <Sparkles className="text-apple-blue" size={20} />
              </div>
              <h4 className="text-lg font-bold text-gray-900">{t.languageSettings}</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { id: 'pt', label: t.portuguese, flag: '🇧🇷' },
                { id: 'en', label: t.english, flag: '🇺🇸' },
              ].map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => onUpdate({ ...settings, language: lang.id as any })}
                  className={cn(
                    "p-6 rounded-3xl border-2 transition-all text-left group",
                    settings.language === lang.id 
                      ? "border-apple-blue bg-apple-blue/5" 
                      : "border-apple-gray-100 hover:border-apple-gray-200 bg-white"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{lang.flag}</span>
                      <span className="text-lg font-bold">{lang.label}</span>
                    </div>
                    {settings.language === lang.id && (
                      <div className="w-6 h-6 bg-apple-blue rounded-full flex items-center justify-center">
                        <Check className="text-white" size={14} />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Inventory Settings */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-apple-blue/10 rounded-xl flex items-center justify-center">
                <Package className="text-apple-blue" size={20} />
              </div>
              <h4 className="text-lg font-bold text-gray-900">{t.lowStockThresholdSetting}</h4>
            </div>
            
            <div className="max-w-xs">
              <p className="text-sm text-gray-500 mb-4">{t.lowStockThresholdDescription}</p>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={settings.lowStockThreshold}
                  onChange={(e) => onUpdate({ ...settings, lowStockThreshold: Number(e.target.value) })}
                  className="apple-input pr-12"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                  {t.unit}s
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ReportsView({ sales, products, customers, t, formatCurrency, settings }: { sales: Sale[], products: Product[], customers: Customer[], t: any, formatCurrency: (v: number) => string, settings: AppSettings }) {
  const [filterType, setFilterType] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [referenceDate, setReferenceDate] = useState(new Date());

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const saleDate = parseISO(sale.date);
      if (filterType === 'daily') {
        return isSameDay(saleDate, referenceDate);
      } else if (filterType === 'weekly') {
        return isWithinInterval(saleDate, {
          start: startOfWeek(referenceDate, { weekStartsOn: 0 }),
          end: endOfWeek(referenceDate, { weekStartsOn: 0 })
        });
      } else {
        return isWithinInterval(saleDate, {
          start: startOfMonth(referenceDate),
          end: endOfMonth(referenceDate)
        });
      }
    });
  }, [sales, filterType, referenceDate]);

  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.totalPrice, 0);
  const totalStockValue = products.reduce((acc, p) => acc + (p.stock * p.averageCost), 0);

  const topProducts = useMemo(() => {
    const map = new Map<string, number>();
    filteredSales.forEach(s => {
      const key = s.brand;
      map.set(key, (map.get(key) || 0) + s.quantity);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredSales]);

  const dateLocale = settings.language === 'pt' ? ptBR : enUS;

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const title = `${t.reportsAnalysis} - ${format(new Date(), 'dd/MM/yyyy')}`;
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(0, 113, 227); // Apple Blue
    doc.text('BebidaFlow', 14, 22);
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(t.reportsAnalysis, 14, 32);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const periodText = filterType === 'daily' 
      ? format(referenceDate, "dd 'de' MMMM yyyy", { locale: dateLocale })
      : filterType === 'weekly'
        ? `${format(startOfWeek(referenceDate, { weekStartsOn: 0 }), "dd/MM/yyyy")} - ${format(endOfWeek(referenceDate, { weekStartsOn: 0 }), "dd/MM/yyyy")}`
        : format(referenceDate, "MMMM 'de' yyyy", { locale: dateLocale });
    doc.text(`${t.date}: ${periodText}`, 14, 40);

    // Financial Summary Table
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(t.financialSummary, 14, 55);
    
    autoTable(doc, {
      startY: 60,
      head: [[t.description, t.total]],
      body: [
        [t.totalRevenue, formatCurrency(totalRevenue)],
        [t.stockValue, formatCurrency(totalStockValue)],
        [t.averageTicket, formatCurrency(sales.length ? totalRevenue / sales.length : 0)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [245, 245, 247], textColor: [0, 0, 0], fontStyle: 'bold' },
    });

    // Top Products Table
    const finalY = (doc as any).lastAutoTable.finalY || 60;
    doc.setFontSize(14);
    doc.text(t.topSellingProducts, 14, finalY + 15);
    
    autoTable(doc, {
      startY: finalY + 20,
      head: [[t.product, t.quantity]],
      body: topProducts.map(p => [p.name, `${p.value} ${t.unit}s`]),
      theme: 'striped',
      headStyles: { fillColor: [245, 245, 247], textColor: [0, 0, 0], fontStyle: 'bold' },
    });

    // Sales Detail Table
    const finalY2 = (doc as any).lastAutoTable.finalY || finalY + 20;
    doc.setFontSize(14);
    doc.text(t.salesRegistry, 14, finalY2 + 15);

    autoTable(doc, {
      startY: finalY2 + 20,
      head: [[t.date, t.product, t.quantity, t.total]],
      body: filteredSales.map(s => [
        format(parseISO(s.date), 'dd/MM/yyyy HH:mm'),
        `${s.brand} (${s.type})`,
        s.quantity,
        formatCurrency(s.totalPrice)
      ]),
      theme: 'striped',
      headStyles: { fillColor: [245, 245, 247], textColor: [0, 0, 0], fontStyle: 'bold' },
    });

    doc.save(`BebidaFlow_Relatorio_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
  };

  const handleExportCSV = () => {
    const headers = [t.date, t.customer, t.product, t.quantity, t.total];
    const rows = filteredSales.map(s => {
      const customer = customers.find(c => c.id === s.customerId);
      return [
        format(parseISO(s.date), 'dd/MM/yyyy HH:mm'),
        customer ? customer.name : 'N/A',
        `${s.brand} (${s.type})`,
        s.quantity,
        s.totalPrice.toFixed(2)
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `BebidaFlow_Vendas_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex bg-apple-gray-100 p-1 rounded-2xl">
            <button 
              onClick={() => setFilterType('daily')}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                filterType === 'daily' ? "bg-white shadow-sm text-apple-blue" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {t.daily}
            </button>
            <button 
              onClick={() => setFilterType('weekly')}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                filterType === 'weekly' ? "bg-white shadow-sm text-apple-blue" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {t.weekly}
            </button>
            <button 
              onClick={() => setFilterType('monthly')}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                filterType === 'monthly' ? "bg-white shadow-sm text-apple-blue" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {t.monthly}
            </button>
          </div>
          
          <input 
            type="date"
            value={format(referenceDate, 'yyyy-MM-dd')}
            onChange={(e) => {
              const date = new Date(e.target.value);
              if (!isNaN(date.getTime())) {
                setReferenceDate(date);
              }
            }}
            className="apple-input py-2 px-4 w-auto"
          />
        </div>

        <div className="text-sm font-medium text-gray-500">
          {filterType === 'daily' && format(referenceDate, "dd 'de' MMMM", { locale: dateLocale })}
          {filterType === 'weekly' && (
            <>
              {format(startOfWeek(referenceDate, { weekStartsOn: 0 }), "dd/MM")} - {format(endOfWeek(referenceDate, { weekStartsOn: 0 }), "dd/MM")}
            </>
          )}
          {filterType === 'monthly' && format(referenceDate, "MMMM 'de' yyyy", { locale: dateLocale })}
        </div>

        <div className="flex gap-2">
          <button 
            onClick={handleExportCSV}
            className="apple-button-secondary flex items-center gap-2"
          >
            <Download size={18} />
            {t.exportCSV}
          </button>
          <button 
            onClick={handleExportPDF}
            className="apple-button-secondary flex items-center gap-2"
          >
            <Download size={18} />
            {t.exportPDF}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="apple-card p-8">
          <h3 className="text-lg font-bold mb-8">{t.financialSummary}</h3>
          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm text-gray-500">{t.totalRevenue}</p>
                <p className="text-3xl font-bold text-apple-blue">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-green-600 font-bold">+12% vs {t.previousMonth}</p>
              </div>
            </div>
            <div className="h-2 bg-apple-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-apple-blue w-3/4" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-apple-gray-50">
                <p className="text-xs text-gray-400 font-bold uppercase">{t.stockValue}</p>
                <p className="text-lg font-bold">{formatCurrency(totalStockValue)}</p>
              </div>
              <div className="p-4 rounded-2xl bg-apple-gray-50">
                <p className="text-xs text-gray-400 font-bold uppercase">{t.averageTicket}</p>
                <p className="text-lg font-bold">{formatCurrency(sales.length ? totalRevenue / sales.length : 0)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="apple-card p-8">
          <h3 className="text-lg font-bold mb-8">{t.topSellingProducts}</h3>
          <div className="space-y-4">
            {topProducts.map((p, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-8 text-sm font-bold text-gray-300">0{i+1}</div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-bold">{p.name}</span>
                    <span className="text-sm text-gray-500">{p.value} {t.unit}s</span>
                  </div>
                  <div className="h-1.5 bg-apple-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-apple-blue" 
                      style={{ width: `${(p.value / (topProducts[0]?.value || 1)) * 100}%` }} 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

