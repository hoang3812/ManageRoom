import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { sendSuccess } from '../../utils/response';
import * as chatService from './chat.service';

export const getConversations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const conversations = await chatService.getConversations(req.user!.id);
  sendSuccess(res, conversations, 'Lấy danh sách hội thoại thành công');
};

export const getOrCreateConversation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { targetUserId } = req.body;
  const conversation = await chatService.getOrCreateConversation(req.user!.id, targetUserId);
  sendSuccess(res, conversation, 'Thành công', 201);
};

export const getMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const page = parseInt((req.query.page as string) || '1');
  const limit = parseInt((req.query.limit as string) || '50');
  const result = await chatService.getMessages(req.params.conversationId, req.user!.id, page, limit);
  sendSuccess(res, result.messages, 'Lấy tin nhắn thành công', 200, result.meta);
};

export const sendMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { content } = req.body;
  const message = await chatService.sendMessage(req.params.conversationId, req.user!.id, content);
  sendSuccess(res, message, 'Gửi tin nhắn thành công', 201);
};
