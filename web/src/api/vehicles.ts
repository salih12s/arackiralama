import api from './client';

export interface Vehicle {
  id: string;
  plate: string;
  name?: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  status: 'IDLE' | 'RENTED' | 'RESERVED' | 'SERVICE';
  active: boolean;
  createdAt: string;
}

export const vehiclesApi = {
  getAll: async (status?: string): Promise<{ data: Vehicle[] }> => {
    const params = status ? { status } : {};
    const response = await api.get('/vehicles', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Vehicle> => {
    const response = await api.get(`/vehicles/${id}`);
    return response.data;
  },

  create: async (data: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vehicle> => {
    const response = await api.post('/vehicles', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Vehicle>): Promise<Vehicle> => {
    const response = await api.patch(`/vehicles/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/vehicles/${id}`);
  },
};
