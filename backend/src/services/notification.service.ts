/**
 * services/notification.service.ts
 * Dịch vụ gửi thông báo: In-app, Email, Push Notification (Firebase FCM)
 */

import prisma from '../config/database';
import { NotificationType } from '@prisma/client';
import logger from '../utils/logger';

// Lazy import Firebase để tránh crash khi chưa cấu hình
let firebaseAdmin: typeof import('firebase-admin') | null = null;

const getFirebase = async () => {
  if (!firebaseAdmin) {
    try {
      const { env } = await import('../config/env');
      if (env.FIREBASE_PROJECT_ID && env.FIREBASE_PRIVATE_KEY && env.FIREBASE_CLIENT_EMAIL) {
        firebaseAdmin = await import('firebase-admin');
        if (!firebaseAdmin.apps.length) {
          firebaseAdmin.initializeApp({
            credential: firebaseAdmin.credential.cert({
              projectId: env.FIREBASE_PROJECT_ID,
              privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
              clientEmail: env.FIREBASE_CLIENT_EMAIL,
            }),
          });
        }
      }
    } catch (err) {
      logger.warn('Firebase chưa được cấu hình, bỏ qua push notification');
    }
  }
  return firebaseAdmin;
};

export const notificationService = {
  /**
   * Tạo thông báo in-app và gửi push notification
   * @param userId - ID người nhận
   * @param title - Tiêu đề thông báo
   * @param body - Nội dung thông báo
   * @param type - Loại thông báo (INVOICE, CONTRACT, etc.)
   * @param data - Dữ liệu bổ sung (navigateToId, etc.)
   */
  async sendNotification(
    userId: string,
    title: string,
    body: string,
    type: NotificationType,
    data?: Record<string, unknown>
  ) {
    // 1. Lưu thông báo vào database (in-app notification)
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        body,
        type,
        data: data as object,
      },
    });

    // 2. Gửi push notification qua Firebase FCM (nếu có)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcmTokens: true },
    });

    if (user?.fcmTokens.length) {
      const firebase = await getFirebase();
      if (firebase) {
        try {
          // Gửi đến tất cả thiết bị của user (multicast)
          await firebase.messaging().sendEachForMulticast({
            tokens: user.fcmTokens,
            notification: { title, body },
            data: {
              type,
              notificationId: notification.id,
              ...(data && Object.fromEntries(
                Object.entries(data).map(([k, v]) => [k, String(v)])
              )),
            },
            android: { priority: 'high' },
            apns: { payload: { aps: { badge: 1, sound: 'default' } } },
          });
        } catch (err) {
          logger.error('Gửi push notification thất bại:', err);
        }
      }
    }

    return notification;
  },

  /**
   * Gửi thông báo cho nhiều users cùng lúc
   */
  async sendBulkNotification(
    userIds: string[],
    title: string,
    body: string,
    type: NotificationType,
    data?: Record<string, unknown>
  ) {
    const results = await Promise.allSettled(
      userIds.map((userId) =>
        notificationService.sendNotification(userId, title, body, type, data)
      )
    );
    return results;
  },

  /**
   * Lấy danh sách thông báo của user
   */
  async getUserNotifications(
    userId: string,
    query: { page: number; limit: number; isRead?: boolean }
  ) {
    const { page = 1, limit = 20, isRead } = query;
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: {
          userId,
          ...(isRead !== undefined && { isRead }),
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({
        where: { userId, ...(isRead !== undefined && { isRead }) },
      }),
      // Đếm số thông báo chưa đọc
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { notifications, total, unreadCount };
  },

  /**
   * Đánh dấu thông báo đã đọc
   */
  async markAsRead(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  },

  /**
   * Đánh dấu tất cả thông báo đã đọc
   */
  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  },
};
