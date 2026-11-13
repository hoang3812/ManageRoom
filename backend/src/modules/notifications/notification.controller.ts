import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { sendSuccess, sendError } from '../../utils/response';
import * as notificationService from '../../services/notification.service';

export const getMyNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const page = parseInt((req.query.page as string) || '1');
  const limit = parseInt((req.query.limit as string) || '20');
  const result = await notificationService.getUserNotifications(req.user!.id, page, limit);
  sendSuccess(res, result.notifications, 'Lấy thông báo thành công', 200, result.meta);
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await notificationService.markAsRead(req.params.id, req.user!.id);
  sendSuccess(res, null, 'Đã đánh dấu đã đọc');
};

export const markAllAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await notificationService.markAllAsRead(req.user!.id);
  sendSuccess(res, null, 'Đã đánh dấu tất cả đã đọc');
};

export const getUnreadCount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const count = await notificationService.getUnreadCount(req.user!.id);
  sendSuccess(res, { count }, 'Lấy số thông báo chưa đọc thành công');
};

export const deleteNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await notificationService.deleteNotification(req.params.id, req.user!.id);
  sendSuccess(res, null, 'Xóa thông báo thành công');
};
