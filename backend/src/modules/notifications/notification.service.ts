import prisma from '../../config/database';
import { NotificationType } from '@prisma/client';
import logger from '../../utils/logger';
import { buildPaginationMeta, calculateSkip } from '../../utils/response';

// ───── FCM (lazy) ─────
let _admin: typeof import('firebase-admin') | null = null;
const getFirebase = async () => {
  if (_admin) return _admin;
  try {
    const { env } = await import('../../config/env');
    if (env.FIREBASE_PROJECT_ID && env.FIREBASE_PRIVATE_KEY && env.FIREBASE_CLIENT_EMAIL) {
      _admin = await import('firebase-admin');
      if (!_admin.apps.length) {
        _admin.initializeApp({
          credential: _admin.credential.cert({
            projectId: env.FIREBASE_PROJECT_ID,
            privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            clientEmail: env.FIREBASE_CLIENT_EMAIL,
          }),
        });
      }
    }
  } catch { logger.warn('Firebase chưa cấu hình, bỏ qua push notification'); }
  return _admin;
};

export const sendNotification = async (
  userId: string, title: string, body: string,
  type: NotificationType, data?: Record<string, unknown>
) => {
  const notification = await prisma.notification.create({
    data: { userId, title, body, type, data: data as object },
  });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { fcmTokens: true } });
  if (user?.fcmTokens.length) {
    const firebase = await getFirebase();
    if (firebase) {
      try {
        await firebase.messaging().sendEachForMulticast({
          tokens: user.fcmTokens,
          notification: { title, body },
          data: { type, notificationId: notification.id, ...Object.fromEntries(Object.entries(data || {}).map(([k, v]) => [k, String(v)])) },
          android: { priority: 'high' },
          apns: { payload: { aps: { badge: 1, sound: 'default' } } },
        });
      } catch (err) { logger.error('FCM error:', err); }
    }
  }
  return notification;
};

export const sendBulkNotification = async (
  userIds: string[], title: string, body: string,
  type: NotificationType, data?: Record<string, unknown>
) => {
  return Promise.allSettled(userIds.map(id => sendNotification(id, title, body, type, data)));
};

export const getUserNotifications = async (userId: string, page: number, limit: number) => {
  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({ where: { userId }, skip: calculateSkip(page, limit), take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.notification.count({ where: { userId } }),
  ]);
  return { notifications, meta: buildPaginationMeta(page, limit, total) };
};

export const markAsRead = async (id: string, userId: string) => {
  return prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true, readAt: new Date() } });
};

export const markAllAsRead = async (userId: string) => {
  return prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true, readAt: new Date() } });
};

export const getUnreadCount = async (userId: string) => {
  return prisma.notification.count({ where: { userId, isRead: false } });
};

export const deleteNotification = async (id: string, userId: string) => {
  await prisma.notification.deleteMany({ where: { id, userId } });
};
