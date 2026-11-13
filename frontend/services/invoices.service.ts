import api from '@/lib/api';
import { ApiResponse, Invoice } from '@/types';

export const invoicesService = {
  getAll: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<Invoice[]>>('/invoices', { params }).then(r => ({ data: r.data.data!, meta: r.data.meta! })),

  getById: (id: string) =>
    api.get<ApiResponse<Invoice>>(`/invoices/${id}`).then(r => r.data.data!),

  generate: (data: { propertyId: string; month: number; year: number }) =>
    api.post<ApiResponse<Invoice[]>>('/invoices/generate', data).then(r => r.data.data!),

  updateStatus: (id: string, status: string) =>
    api.patch<ApiResponse<Invoice>>(`/invoices/${id}/status`, { status }).then(r => r.data.data!),

  delete: (id: string) =>
    api.delete(`/invoices/${id}`),
};
