import api from '@/lib/api';
import { ApiResponse, Notification } from '@/types';

export const notificationsService = {
  getAll: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<Notification[]>>('/notifications', { params }).then(r => ({ data: r.data.data!, meta: r.data.meta! })),

  getUnreadCount: () =>
    api.get<ApiResponse<{ count: number }>>('/notifications/unread-count').then(r => r.data.data!),

  markAsRead: (id: string) =>
    api.patch(`/notifications/${id}/read`),

  markAllAsRead: () =>
    api.patch('/notifications/read-all'),

  delete: (id: string) =>
    api.delete(`/notifications/${id}`),
};
