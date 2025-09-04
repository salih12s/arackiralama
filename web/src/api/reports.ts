import api from './client';

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

export interface MonthlyReportItem {
  label: string;
  month: number;
  year: number;
  billed: number;
  collected: number;
  outstanding: number;
}

export interface DebtorCustomer {
  customerId: string;
  customerName: string;
  totalDebt: number;
}

export interface VehicleRevenue {
  licensePlate: string;
  totalRevenue: number;
}

export const reportsApi = {
  getDashboardStats: async (month?: number, year?: number): Promise<DashboardStats> => {
    const params = new URLSearchParams();
    if (month) params.append('month', month.toString());
    if (year) params.append('year', year.toString());
    
    const response = await api.get(`/stats/today?${params.toString()}`);
    return response.data;
  },

  getMonthlyReport: async (year: number): Promise<MonthlyReportItem[]> => {
    const response = await api.get(`/reports/monthly?year=${year}`);
    return response.data;
  },

  getDebtors: async (): Promise<DebtorCustomer[]> => {
    const response = await api.get('/reports/debtors');
    return response.data;
  },

  getVehicleRevenue: async (): Promise<VehicleRevenue[]> => {
    const response = await api.get('/reports/vehicle-revenue');
    return response.data;
  },
};
