import api from '@/lib/api';
import { ApiResponse } from '@/types';

export const reportsService = {
  getRevenue: (params: { fromMonth?: number; fromYear?: number; toMonth?: number; toYear?: number }) =>
    api.get<ApiResponse<unknown>>('/reports/revenue', { params }).then(r => r.data.data!),

  getOccupancy: () =>
    api.get<ApiResponse<unknown>>('/reports/occupancy').then(r => r.data.data!),

  getDebt: () =>
    api.get<ApiResponse<unknown>>('/reports/debt').then(r => r.data.data!),

  exportRevenueExcel: (params: Record<string, unknown>) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/reports/revenue/export?${query}`, '_blank');
  },

  exportDebtExcel: () => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/reports/debt/export`, '_blank');
  },
};
