/**
 * modules/notifications/notification.routes.ts
 * Routes cho Notification module
 */

import { Router, Response } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { notificationService } from '../../services/notification.service';
import { sendSuccess } from '../../utils/response';
import { buildPaginationMeta } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const router = Router();
router.use(authenticate);

/** GET /api/v1/notifications - Danh sách thông báo */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', limit = '20', isRead } = req.query as {
    page?: string; limit?: string; isRead?: string;
  };
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  const { notifications, total, unreadCount } = await notificationService.getUserNotifications(
    req.user!.id,
    {
      page: pageNum,
      limit: limitNum,
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
    }
  );

  const meta = buildPaginationMeta(pageNum, limitNum, total);
  sendSuccess(res, { notifications, unreadCount }, 'Lấy thông báo thành công', 200, meta);
});

/** PATCH /api/v1/notifications/:id/read - Đánh dấu đã đọc */
router.patch('/:id/read', async (req: AuthenticatedRequest, res: Response) => {
  await notificationService.markAsRead(req.params.id, req.user!.id);
  sendSuccess(res, null, 'Đã đánh dấu đọc');
});

/** PATCH /api/v1/notifications/read-all - Đánh dấu tất cả đã đọc */
router.patch('/read-all', async (req: AuthenticatedRequest, res: Response) => {
  await notificationService.markAllAsRead(req.user!.id);
  sendSuccess(res, null, 'Đã đánh dấu tất cả đã đọc');
});

export default router;
