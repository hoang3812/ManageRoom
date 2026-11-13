/**
 * sockets/chat.socket.ts
 * Socket.IO event handlers cho real-time chat
 * Xử lý: kết nối, join room, gửi tin nhắn, typing indicator, disconnect
 */

import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import prisma from '../config/database';
import { chatService } from '../modules/chat/chat.routes';
import logger from '../utils/logger';

// Lưu mapping userId -> Set<socketId> (user có thể có nhiều kết nối)
const userSockets = new Map<string, Set<string>>();

/**
 * Khởi tạo Socket.IO với authentication và chat handlers
 * @param io - Socket.IO server instance
 */
export const initSocketHandlers = (io: Server): void => {
  // ============================================================
  // Middleware xác thực Socket.IO bằng JWT token
  // Client phải gửi token trong handshake: io({ auth: { token } })
  // ============================================================
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Cần đăng nhập để kết nối'));
      }

      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.sub, isActive: true },
        select: { id: true, fullName: true, role: true },
      });

      if (!user) {
        return next(new Error('Tài khoản không hợp lệ'));
      }

      // Đính kèm thông tin user vào socket
      (socket as Socket & { userId: string; userFullName: string }).userId = user.id;
      (socket as Socket & { userId: string; userFullName: string }).userFullName = user.fullName;

      next();
    } catch {
      next(new Error('Token không hợp lệ'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as Socket & { userId: string }).userId;
    const userFullName = (socket as Socket & { userFullName: string }).userFullName;

    logger.info(`Socket connected: ${userFullName} (${userId}) - Socket: ${socket.id}`);

    // Thêm socket vào danh sách của user
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    // User online: gửi status cho tất cả conversations
    socket.broadcast.emit('user:online', { userId });

    // ============================================================
    // Join conversation room
    // Client emit: socket.emit('join:conversation', conversationId)
    // ============================================================
    socket.on('join:conversation', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
      logger.debug(`${userFullName} joined conversation: ${conversationId}`);
    });

    // ============================================================
    // Gửi tin nhắn
    // Client emit: socket.emit('message:send', { conversationId, content })
    // Server broadcast: socket.to(room).emit('message:new', message)
    // ============================================================
    socket.on(
      'message:send',
      async (data: { conversationId: string; content: string }) => {
        try {
          if (!data.content?.trim() || !data.conversationId) return;

          // Lưu tin nhắn vào database
          const message = await chatService.sendMessage(
            data.conversationId,
            userId,
            data.content.trim()
          );

          // Broadcast tin nhắn mới đến tất cả thành viên trong conversation
          io.to(`conversation:${data.conversationId}`).emit('message:new', message);
        } catch (error) {
          socket.emit('error', { message: 'Gửi tin nhắn thất bại' });
          logger.error('Socket send message error:', error);
        }
      }
    );

    // ============================================================
    // Typing indicator (hiển thị "đang gõ...")
    // Client emit: socket.emit('typing:start', { conversationId })
    // ============================================================
    socket.on('typing:start', (data: { conversationId: string }) => {
      socket.to(`conversation:${data.conversationId}`).emit('typing:start', {
        userId,
        userName: userFullName,
        conversationId: data.conversationId,
      });
    });

    socket.on('typing:stop', (data: { conversationId: string }) => {
      socket.to(`conversation:${data.conversationId}`).emit('typing:stop', {
        userId,
        conversationId: data.conversationId,
      });
    });

    // ============================================================
    // Disconnect
    // ============================================================
    socket.on('disconnect', () => {
      // Xóa socket khỏi danh sách
      userSockets.get(userId)?.delete(socket.id);
      if (userSockets.get(userId)?.size === 0) {
        userSockets.delete(userId);
        // User offline hoàn toàn
        socket.broadcast.emit('user:offline', { userId });
      }

      logger.info(`Socket disconnected: ${userFullName} - Socket: ${socket.id}`);
    });
  });
};

/**
 * Gửi thông báo realtime đến một user cụ thể qua Socket
 * Dùng để push thông báo mà không cần FCM
 * @param io - Socket.IO server instance
 * @param userId - ID người nhận
 * @param event - Tên event
 * @param data - Dữ liệu gửi kèm
 */
export const emitToUser = (
  io: Server,
  userId: string,
  event: string,
  data: unknown
): void => {
  const socketIds = userSockets.get(userId);
  if (socketIds) {
    socketIds.forEach((socketId) => {
      io.to(socketId).emit(event, data);
    });
  }
};
