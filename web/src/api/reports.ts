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
}

export interface MonthlyReportItem {
  label: string;
  month: number;
  year: number;
  billed: number;
  collected: number;
  outstanding: number;
}

export const reportsApi = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/reports/dashboard');
    return response.data;
  },

  getMonthlyReport: async (year: number): Promise<MonthlyReportItem[]> => {
    const response = await api.get(`/reports/monthly?year=${year}`);
    return response.data;
  },
};
