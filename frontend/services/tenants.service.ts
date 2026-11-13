import api from '@/lib/api';
import { ApiResponse, Tenant } from '@/types';

export const tenantsService = {
  getAll: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<Tenant[]>>('/tenants', { params }).then(r => ({ data: r.data.data!, meta: r.data.meta! })),

  getById: (id: string) =>
    api.get<ApiResponse<Tenant>>(`/tenants/${id}`).then(r => r.data.data!),

  create: (data: Record<string, unknown>) =>
    api.post<ApiResponse<Tenant>>('/tenants', data).then(r => r.data.data!),

  update: (id: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<Tenant>>(`/tenants/${id}`, data).then(r => r.data.data!),

  delete: (id: string) =>
    api.delete(`/tenants/${id}`),
};
