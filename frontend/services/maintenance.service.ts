import api from '@/lib/api';
import { ApiResponse, MaintenanceRequest } from '@/types';

export const maintenanceService = {
  getAll: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<MaintenanceRequest[]>>('/maintenance', { params }).then(r => ({ data: r.data.data!, meta: r.data.meta! })),

  getById: (id: string) =>
    api.get<ApiResponse<MaintenanceRequest>>(`/maintenance/${id}`).then(r => r.data.data!),

  create: (data: FormData) =>
    api.post<ApiResponse<MaintenanceRequest>>('/maintenance', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data!),

  update: (id: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<MaintenanceRequest>>(`/maintenance/${id}`, data).then(r => r.data.data!),

  assign: (id: string, assigneeId: string) =>
    api.patch<ApiResponse<MaintenanceRequest>>(`/maintenance/${id}/assign`, { assigneeId }).then(r => r.data.data!),

  rate: (id: string, rating: number, feedback?: string) =>
    api.post<ApiResponse<MaintenanceRequest>>(`/maintenance/${id}/rate`, { rating, feedback }).then(r => r.data.data!),
};
