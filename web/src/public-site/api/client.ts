import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3005/api',
  timeout: 15000,
});

export interface Quote {
  days: number;
  dailyRateTL: number;
  totalTL: number;
}

export interface PublicVehicle {
  id: string;
  name: string;
  plate: string;
  category: string | null;
  year: number | null;
  fuelType: string | null;
  transmission: string | null;
  seats: number | null;
  dailyRate: number | null; // TL
  imageUrl: string | null;
  available: boolean;
  unavailableReason?: 'RENTED' | 'RESERVED' | 'SERVICE' | 'NOT_LISTED';
  quote?: Quote | null;
  description?: string | null;
  gallery?: Array<{ id: string; imageUrl: string; altText?: string | null; sortOrder: number; isPrimary: boolean }>;
}

export interface ReservationLookupResult {
  code: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  vehicleName: string;
  vehiclePlate: string | null;
  startDate: string;
  endDate: string;
  pickupTime: string;
  days: number;
  totalTL: number | null;
  pickupLocation: string | null;
  createdAt: string;
}

export interface CreateReservationInput {
  vehicleId: string;
  fullName: string;
  phone: string;
  email?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  pickupTime?: string; // HH:mm
  pickupLocation?: string;
  note?: string;
  termsAccepted: true;
}

export interface CreateReservationResponse {
  message: string;
  reservation: { code: string; status: string; createdAt: string };
  quote: Quote | null;
}

export const publicApi = {
  getVehicles: (params?: { start?: string; end?: string }) =>
    api.get<{ data: PublicVehicle[] }>('/public/vehicles', { params }),

  getVehicle: (id: string, params?: { start?: string; end?: string }) =>
    api.get<{ data: PublicVehicle; similar: PublicVehicle[] }>(`/public/vehicles/${id}`, { params }),

  getCategories: () => api.get<{ data: string[] }>('/public/categories'),

  createReservation: (input: CreateReservationInput) =>
    api.post<CreateReservationResponse>('/public/reservations', input),

  lookupReservation: (code: string, phone: string) =>
    api.get<{ data: ReservationLookupResult }>(`/public/reservations/${encodeURIComponent(code)}`, {
      params: { phone },
    }),
};

/** API hatasından kullanıcıya gösterilecek güvenli mesajı çıkarır. */
export function apiErrorMessage(error: unknown, fallback = 'Bir sorun oluştu. Lütfen tekrar deneyin.'): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { error?: string } | undefined)?.error;
    if (message) return message;
  }
  return fallback;
}

export default api;
