import api from '@/lib/api';
import { ApiResponse, Contract } from '@/types';

export const contractsService = {
  getAll: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<Contract[]>>('/contracts', { params }).then(r => ({ data: r.data.data!, meta: r.data.meta! })),

  getById: (id: string) =>
    api.get<ApiResponse<Contract>>(`/contracts/${id}`).then(r => r.data.data!),

  create: (data: Record<string, unknown>) =>
    api.post<ApiResponse<Contract>>('/contracts', data).then(r => r.data.data!),

  update: (id: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<Contract>>(`/contracts/${id}`, data).then(r => r.data.data!),

  terminate: (id: string, reason?: string) =>
    api.patch<ApiResponse<Contract>>(`/contracts/${id}/terminate`, { reason }).then(r => r.data.data!),

  renew: (id: string, data: Record<string, unknown>) =>
    api.post<ApiResponse<Contract>>(`/contracts/${id}/renew`, data).then(r => r.data.data!),
};
