import apiClient from './client';

export interface VehicleAnalytics {
  vehicle: {
    id: string;
    plate: string;
    brand: string;
    model: string;
    year: number;
    color: string;
    status: string;
    note?: string;
  };
  statistics: {
    totalRevenue: number;
    totalPaid: number;
    totalOutstanding: number;
    totalRentals: number;
    totalDays: number;
    avgDailyRate: number;
    avgRentalDuration: number;
    utilizationRate: number;
  };
  monthlyTrends: Array<{
    month: string;
    revenue: number;
  }>;
  customerHistory: Array<{
    customerName: string;
    rentalCount: number;
    totalSpent: number;
    lastRental: Date;
  }>;
  recentRentals: Array<{
    id: string;
    customerName: string;
    startDate: Date;
    endDate: Date;
    days: number;
    totalDue: number;
    status: string;
  }>;
}

export interface OverviewAnalytics {
  vehicleStats: {
    total: number;
    idle: number;
    rented: number;
    reserved: number;
    service: number;
  };
  monthlyStats: {
    revenue: number;
    paid: number;
    outstanding: number;
    rentalCount: number;
  };
  topVehicles: Array<{
    id: string;
    plate: string;
    brand: string;
    model: string;
    revenue: number;
    rentalCount: number;
  }>;
}

export const analyticsApi = {
  async getVehicleAnalytics(vehicleId: string): Promise<VehicleAnalytics> {
    const response = await apiClient.get(`/analytics/vehicle/${vehicleId}`);
    return response.data;
  },

  async getOverviewAnalytics(): Promise<OverviewAnalytics> {
    const response = await apiClient.get('/analytics/overview');
    return response.data;
  }
};
