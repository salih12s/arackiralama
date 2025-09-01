import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3005/api',
  timeout: 30000, // Increase timeout
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('🔑 Token:', token ? 'exists' : 'missing');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('🚨 API Error:', error.response?.status, error.response?.data);
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Remove token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// API Types
export interface User {
  id: string;
  email: string;
  role: string;
}

export interface Vehicle {
  rentals: never[];
  id: string;
  plate: string;
  name?: string;
  active: boolean;
  status: 'IDLE' | 'RENTED' | 'RESERVED' | 'SERVICE';
  createdAt: string;
  _count?: {
    rentals: number;
  };
  performance?: {
    totalRevenue: number; // in kuruş
    totalCollected: number; // in kuruş
    totalBalance: number; // in kuruş
  };
}

export interface Customer {
  id: string;
  fullName: string;
  phone?: string;
}

export interface Customer {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
  address?: string;
  identityNumber?: string;
  createdAt: string;
  updatedAt: string;
  rentalCount?: number;
}

export interface Rental {
  customerName: any;
  customerPhone: any;
  vehicleName: any;
  vehiclePlate: any;
  id: string;
  vehicleId: string;
  customerId: string;
  startDate: string;
  endDate: string;
  days: number;
  dailyPrice: number;
  kmDiff: number;
  cleaning: number;
  hgs: number;
  damage: number;
  fuel: number;
  totalDue: number;
  upfront: number;
  pay1: number;
  pay2: number;
  pay3: number;
  pay4: number;
  payDate1?: string;
  payDate2?: string;
  payDate3?: string;
  payDate4?: string;
  balance: number;
  status: 'ACTIVE' | 'RETURNED' | 'COMPLETED' | 'CANCELLED';
  note?: string;
  deleted?: boolean;
  deletedAt?: string;
  createdAt: string;
  vehicle: Vehicle;
  customer: Customer;
  payments: Payment[];
}

export interface Payment {
  id: string;
  rentalId: string;
  amount: number;
  paidAt: string;
  method: 'CASH' | 'TRANSFER' | 'CARD';
  rental?: Rental;
}

export interface DashboardStats {
  totalVehicles: number;
  rentedToday: number;
  idle: number;
  reserved: number;
  service: number;
  monthBilled: number;
  monthCollected: number;
  monthOutstanding: number;
  monthVehicleProfit: number; // Sadece kiralama ücreti + km farkı
}

export interface MonthlyReport {
  label: string;
  month: number;
  year: number;
  billed: number;
  collected: number;
  outstanding: number;
}

export interface VehicleIncomeReport {
  plate: string;
  vehicleId: string;
  billed: number;
  collected: number;
  outstanding: number;
}

export interface DebtorReport {
  rentalId: string;
  plate: string;
  customerName: string;
  startDate: string;
  endDate: string;
  balance: number;
  days: number;
}

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: User }>('/auth/login', { email, password }),
};

// Vehicles API
export const vehiclesApi = {
  getAll: (status?: string) =>
    api.get<Vehicle[]>(`/vehicles${status ? `?status=${status}` : ''}`),
  getById: (id: string) => api.get<Vehicle>(`/vehicles/${id}`),
  create: (data: { plate: string; name?: string }) =>
    api.post<Vehicle>('/vehicles', data),
  update: (id: string, data: Partial<Vehicle>) =>
    api.patch<Vehicle>(`/vehicles/${id}`, data),
  delete: (id: string) => api.delete(`/vehicles/${id}`),
};

// Rentals API
export const rentalsApi = {
  getAll: (params?: {
    search?: string;
    plate?: string;
    customer?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
    include?: string[];
  }) => api.get<{ data: Rental[]; pagination: any }>('/rentals', { params }),
  getById: (id: string) => api.get<Rental>(`/rentals/${id}`),
  create: (data: {
    vehicleId: string;
    customerName: string;
    customerPhone?: string;
    startDate: string;
    endDate: string;
    days?: number;
    dailyPrice: number;
    kmDiff?: number;
    cleaning?: number;
    hgs?: number;
    damage?: number;
    fuel?: number;
    upfront?: number;
    pay1?: number;
    pay2?: number;
    pay3?: number;
    pay4?: number;
    note?: string;
  }) => api.post<Rental>('/rentals', data),
  update: (id: string, data: {
    vehicleId: string;
    customerName: string;
    customerPhone?: string;
    startDate: string;
    endDate: string;
    days?: number;
    dailyPrice: number;
    kmDiff?: number;
    cleaning?: number;
    hgs?: number;
    damage?: number;
    fuel?: number;
    upfront?: number;
    pay1?: number;
    pay2?: number;
    pay3?: number;
    pay4?: number;
    note?: string;
  }) => api.patch<Rental>(`/rentals/${id}`, data),
  returnRental: (id: string) => api.post<Rental>(`/rentals/${id}/return`),
  complete: (id: string) => api.post<Rental>(`/rentals/${id}/complete`),
  delete: (id: string) => api.delete(`/rentals/${id}`),
  getPayments: (id: string) => api.get<Payment[]>(`/rentals/${id}/payments`),
  addPayment: (
    id: string,
    data: {
      amount: number;
      paidAt: string;
      method: 'CASH' | 'TRANSFER' | 'CARD';
    }
  ) => api.post<{ payment: Payment; rental: Rental }>(`/rentals/${id}/payments`, data),
};

// Payments API
export const paymentsApi = {
  updatePaymentDate: (paymentId: string, paidAt: string) => 
    api.patch<Payment>(`/payments/${paymentId}/date`, { paidAt }),
};

// Customers API
export const customersApi = {
  getAll: (search?: string) => 
    api.get<{ success: boolean; data: Customer[] }>(`/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getById: (id: string) => api.get<{ success: boolean; data: Customer }>(`/customers/${id}`),
  create: (data: {
    fullName: string;
    phone?: string;
    email?: string;
    address?: string;
    identityNumber?: string;
  }) => api.post<{ success: boolean; data: Customer }>('/customers', data),
  update: (id: string, data: Partial<{
    fullName: string;
    phone?: string;
    email?: string;
    address?: string;
    identityNumber?: string;
  }>) => api.put<{ success: boolean; data: Customer }>(`/customers/${id}`, data),
  delete: (id: string) => api.delete<{ success: boolean; message: string }>(`/customers/${id}`),
};

// Reports API
export const reportsApi = {
  getDashboardStats: (month?: number, year?: number) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month.toString());
    if (year) params.append('year', year.toString());
    
    return api.get<DashboardStats>(`/stats/today?${params.toString()}`);
  },
  getMonthlyReport: (year: number) =>
    api.get<MonthlyReport[]>(`/reports/monthly?year=${year}`),
  getVehicleIncomeReport: () => api.get<VehicleIncomeReport[]>('/reports/vehicle-income'),
  getDebtors: () => api.get<DebtorReport[]>('/reports/debtors'),
};

// Backup API
export const backupApi = {
  exportBackup: () => api.post<{
    success: boolean;
    message: string;
    backup: {
      filename: string;
      timestamp: string;
      size: number;
      recordCounts: Record<string, number>;
    };
    downloadData: any;
  }>('/backup/export'),
  getBackupHistory: () => api.get<{
    success: boolean;
    backups: Array<{
      filename: string;
      timestamp: string;
      size: number;
      recordCounts: Record<string, number>;
      created: string;
      error?: string;
    }>;
  }>('/backup/history'),
  downloadBackup: (filename: string) => api.get(`/backup/download/${filename}`, {
    responseType: 'blob'
  }),
  deleteBackup: (filename: string) => api.delete<{
    success: boolean;
    message: string;
  }>(`/backup/${filename}`),
};

// Utility functions
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100) + ' TL'; // Convert from kuruş to TRY and add TL suffix
};

export const formatDate = (date: string): string => {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
};
