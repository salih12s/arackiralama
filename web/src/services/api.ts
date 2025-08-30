export { analyticsApi } from './analytics';
export { vehiclesApi } from './vehicles';
export { rentalsApi } from './rentals';
export { apiClient } from './client';

export type {
  OverviewStats,
  VehicleAnalytics,
  MonthlyReportItem
} from './analytics';

export type {
  Vehicle,
  CreateVehicleData,
  UpdateVehicleData
} from './vehicles';

export type {
  Rental,
  CreateRentalData,
  RentalFilters,
  RentalResponse
} from './rentals';
