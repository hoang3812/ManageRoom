import api from '@/lib/api';
import { ApiResponse, Property, PaginationMeta } from '@/types';

interface PropertiesResponse { data: Property[]; meta: PaginationMeta; }

export const propertiesService = {
  getAll: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<Property[]>>('/properties', { params }).then(r => ({ data: r.data.data!, meta: r.data.meta! })),

  getById: (id: string) =>
    api.get<ApiResponse<Property>>(`/properties/${id}`).then(r => r.data.data!),

  create: (data: FormData | Record<string, unknown>) =>
    api.post<ApiResponse<Property>>('/properties', data).then(r => r.data.data!),

  update: (id: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<Property>>(`/properties/${id}`, data).then(r => r.data.data!),

  delete: (id: string) =>
    api.delete(`/properties/${id}`),

  uploadImages: (id: string, files: File[]) => {
    const form = new FormData();
    files.forEach(f => form.append('images', f));
    return api.post<ApiResponse<Property>>(`/properties/${id}/images`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data!);
  },
};
