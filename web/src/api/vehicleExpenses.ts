import api from './client';

export interface VehicleExpense {
  id: string;
  date: string;
  vehicleId: string;
  expenseType: string;
  location: string;
  amount: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
  vehicle: {
    id: string;
    plate: string;
    name: string;
  };
}

export interface CreateVehicleExpenseData {
  date: string;
  vehicleId: string;
  expenseType: string;
  location: string;
  amount: number;
  description?: string;
}

export interface UpdateVehicleExpenseData {
  date?: string;
  vehicleId?: string;
  expenseType?: string;
  location?: string;
  amount?: number;
  description?: string;
}

export const vehicleExpensesApi = {
  getAll: async (): Promise<VehicleExpense[]> => {
    const response = await api.get('/vehicle-expenses');
    return response.data;
  },

  getById: async (id: string): Promise<VehicleExpense> => {
    const response = await api.get(`/vehicle-expenses/${id}`);
    return response.data;
  },

  create: async (data: CreateVehicleExpenseData): Promise<VehicleExpense> => {
    const response = await api.post('/vehicle-expenses', data);
    return response.data;
  },

  update: async (id: string, data: UpdateVehicleExpenseData): Promise<VehicleExpense> => {
    const response = await api.put(`/vehicle-expenses/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/vehicle-expenses/${id}`);
  },
};