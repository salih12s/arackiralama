import { apiClient } from './client';

export interface Rental {
  id: string;
  vehicleId: string;
  customerId: string;
  startDate: string;
  endDate: string;
  days: number;
  dailyPrice: number;
  totalDue: number;
  balance: number;
  status: 'ACTIVE' | 'RETURNED' | 'CANCELLED';
  note?: string;
  createdAt: string;
  vehicle: {
    id: string;
    plate: string;
    brand: string;
    model: string;
  };
  customer: {
    id: string;
    fullName: string;
    phone?: string;
  };
}

export interface CreateRentalData {
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
}

export interface RentalFilters {
  search?: string;
  plate?: string;
  customer?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface RentalResponse {
  data: Rental[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const rentalsApi = {
  getAll: async (filters?: RentalFilters): Promise<RentalResponse> => {
    const response = await apiClient.get('/rentals', { params: filters });
    return response.data;
  },

  getById: async (id: string): Promise<Rental> => {
    const response = await apiClient.get(`/rentals/${id}`);
    return response.data;
  },

  create: async (data: CreateRentalData): Promise<Rental> => {
    const response = await apiClient.post('/rentals', data);
    return response.data;
  },

  returnRental: async (id: string): Promise<Rental> => {
    const response = await apiClient.post(`/rentals/${id}/return`);
    return response.data;
  },
};
