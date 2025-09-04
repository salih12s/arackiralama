import api from './client';

export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
  driverLicense: string;
}

export interface Rental {
  id: string;
  vehicleId: string;
  customerId: string;
  startDate: string;
  endDate: string;
  days: number;
  dailyPrice: number; // Already in TL from backend
  totalDue: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  kmDiff: number; // Already in TL from backend  
  cleaning: number;
  hgs: number;
  damage: number;
  fuel: number;
  upfront: number;
  pay1: number;
  pay2: number;
  pay3: number;
  pay4: number;
  kmPrice?: number; // Added this field
  note?: string;
  createdAt: string;
  updatedAt: string;
  totalPaid?: number; // Toplam ödenen miktar (taksitler + ek ödemeler)
  balance?: number; // Kalan bakiye
  vehicle: {
    id: string;
    plate: string;
    brand: string;
    model: string;
  };
  customer: Customer;
  payments?: Array<{
    id: string;
    amount: number;
    method: string;
    note?: string;
    createdAt: string;
  }>;
}

export interface RentalFilters {
  search?: string;
  plate?: string;
  customer?: string;
  from?: string;
  to?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const rentalsApi = {
  getAll: async (filters?: RentalFilters): Promise<{ data: Rental[]; pagination: { total: number; page: number; limit: number; pages: number } }> => {
    const response = await api.get('/rentals', { params: filters });
    return response.data;
  },

  getById: async (id: string): Promise<Rental> => {
    const response = await api.get(`/rentals/${id}`);
    return response.data;
  },

  create: async (data: any): Promise<Rental> => {
    const response = await api.post('/rentals', data);
    return response.data;
  },

  update: async (id: string, data: any): Promise<Rental> => {
    const response = await api.patch(`/rentals/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/rentals/${id}`);
  },
};
