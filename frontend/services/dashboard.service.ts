import api from '@/lib/api';
import { ApiResponse, DashboardStats, RevenueChartData } from '@/types';

export const dashboardService = {
  getOverview: () =>
    api.get<ApiResponse<DashboardStats>>('/dashboard/overview').then(r => r.data.data!),

  getRevenueChart: (year?: number) =>
    api.get<ApiResponse<{ year: number; chartData: RevenueChartData[] }>>('/dashboard/revenue-chart', {
      params: { year },
    }).then(r => r.data.data!),

  getRoomStatus: () =>
    api.get<ApiResponse<{ available: number; occupied: number; maintenance: number; inactive: number }>>('/dashboard/room-status').then(r => r.data.data!),

  getRecentActivities: () =>
    api.get<ApiResponse<unknown>>('/dashboard/recent-activities').then(r => r.data.data!),

  getExpiringContracts: (days = 30) =>
    api.get<ApiResponse<unknown[]>>('/dashboard/expiring-contracts', { params: { days } }).then(r => r.data.data!),
};
