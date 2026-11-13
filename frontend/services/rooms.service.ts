import api from '@/lib/api';
import { ApiResponse, Room, RoomType } from '@/types';

export const roomsService = {
  getAll: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<Room[]>>('/rooms', { params }).then(r => ({ data: r.data.data!, meta: r.data.meta! })),

  getById: (id: string) =>
    api.get<ApiResponse<Room>>(`/rooms/${id}`).then(r => r.data.data!),

  create: (data: Record<string, unknown>) =>
    api.post<ApiResponse<Room>>('/rooms', data).then(r => r.data.data!),

  update: (id: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<Room>>(`/rooms/${id}`, data).then(r => r.data.data!),

  delete: (id: string) =>
    api.delete(`/rooms/${id}`),

  uploadImages: (id: string, files: File[]) => {
    const form = new FormData();
    files.forEach(f => form.append('images', f));
    return api.post<ApiResponse<Room>>(`/rooms/${id}/images`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data!);
  },

  updateStatus: (id: string, status: string) =>
    api.patch<ApiResponse<Room>>(`/rooms/${id}/status`, { status }).then(r => r.data.data!),

  getTypes: () =>
    api.get<ApiResponse<RoomType[]>>('/rooms/types').then(r => r.data.data!),

  createType: (data: { name: string; description?: string }) =>
    api.post<ApiResponse<RoomType>>('/rooms/types', data).then(r => r.data.data!),
};
