import { apiClient } from './client';

export interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  status: 'IDLE' | 'RENTED' | 'RESERVED' | 'SERVICE';
  active: boolean;
  note?: string;
  createdAt: string;
}

export interface CreateVehicleData {
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  note?: string;
}

export interface UpdateVehicleData {
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  status?: 'IDLE' | 'RENTED' | 'RESERVED' | 'SERVICE';
  active?: boolean;
  note?: string;
}

export const vehiclesApi = {
  getAll: async (status?: string): Promise<Vehicle[]> => {
    const response = await apiClient.get('/vehicles', {
      params: status ? { status } : {},
    });
    return response.data;
  },

  getById: async (id: string): Promise<Vehicle> => {
    const response = await apiClient.get(`/vehicles/${id}`);
    return response.data;
  },

  create: async (data: CreateVehicleData): Promise<Vehicle> => {
    const response = await apiClient.post('/vehicles', data);
    return response.data;
  },

  update: async (id: string, data: UpdateVehicleData): Promise<Vehicle> => {
    const response = await apiClient.patch(`/vehicles/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/vehicles/${id}`);
  },
};
