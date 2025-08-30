import { apiClient } from './client';

export interface OverviewStats {
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

export interface MonthlyReportItem {
  label: string;
  month: number;
  year: number;
  billed: number;
  collected: number;
  outstanding: number;
}

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
    lastRental: string;
  }>;
  recentRentals: Array<{
    id: string;
    customerName: string;
    startDate: string;
    endDate: string;
    days: number;
    totalDue: number;
    status: string;
  }>;
}

export interface SystemOverview {
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
  getVehicleAnalytics: (vehicleId: string): Promise<VehicleAnalytics> =>
    apiClient.get(`/analytics/vehicle/${vehicleId}`).then((res: any) => res.data),

  getOverview: (): Promise<OverviewStats> =>
    apiClient.get('/analytics/overview').then((res: any) => res.data),
    
  getMonthlyReport: (year: number): Promise<MonthlyReportItem[]> =>
    apiClient.get(`/reports/monthly?year=${year}`).then((res: any) => res.data),
};
