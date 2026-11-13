import api from '@/lib/api';
import { ApiResponse, Conversation, Message } from '@/types';

export const chatService = {
  getConversations: () =>
    api.get<ApiResponse<Conversation[]>>('/chat/conversations').then(r => r.data.data!),

  openConversation: (userId: string) =>
    api.post<ApiResponse<Conversation>>(`/chat/conversations/${userId}`).then(r => r.data.data!),

  getMessages: (conversationId: string, params?: Record<string, unknown>) =>
    api.get<ApiResponse<{ messages: Message[]; total: number }>>(`/chat/conversations/${conversationId}/messages`, { params }).then(r => r.data.data!),
};
