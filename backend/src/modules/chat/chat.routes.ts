/**
 * modules/chat/chat.service.ts + chat.routes.ts
 * Module Chat: Nhắn tin trực tiếp giữa chủ trọ và người thuê
 * Sử dụng Socket.IO cho real-time, lưu lịch sử vào PostgreSQL
 */

import { Router, Response } from 'express';
import prisma from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';
import { authenticate } from '../../middlewares/auth.middleware';
import { upload, uploadToCloudinary } from '../../middlewares/upload.middleware';

// ============================================================
// CHAT SERVICE
// ============================================================
export const chatService = {
  /**
   * Tìm hoặc tạo conversation 1-1 giữa 2 users
   * Conversation giữa 2 users là unique
   */
  async getOrCreateConversation(userId1: string, userId2: string) {
    // Tìm conversation đã tồn tại giữa 2 users
    const existing = await prisma.conversation.findFirst({
      where: {
        participants: {
          every: { userId: { in: [userId1, userId2] } },
        },
        // Đảm bảo đúng 2 participants
        AND: [
          { participants: { some: { userId: userId1 } } },
          { participants: { some: { userId: userId2 } } },
        ],
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, fullName: true, avatar: true, role: true } },
          },
        },
      },
    });

    if (existing) return existing;

    // Tạo conversation mới
    return prisma.conversation.create({
      data: {
        participants: {
          create: [{ userId: userId1 }, { userId: userId2 }],
        },
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, fullName: true, avatar: true, role: true } },
          },
        },
      },
    });
  },

  /**
   * Lấy danh sách conversations của user
   */
  async getConversations(userId: string) {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: { some: { userId } },
      },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        participants: {
          include: {
            user: { select: { id: true, fullName: true, avatar: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Tin nhắn cuối
          select: {
            content: true,
            createdAt: true,
            isRead: true,
            senderId: true,
          },
        },
      },
    });

    // Thêm thông tin partner và số tin nhắn chưa đọc
    return conversations.map((conv) => ({
      ...conv,
      partner: conv.participants.find((p) => p.userId !== userId)?.user,
    }));
  },

  /**
   * Lấy lịch sử tin nhắn của một conversation
   */
  async getMessages(
    conversationId: string,
    userId: string,
    query: { page: number; limit: number }
  ) {
    // Kiểm tra user có trong conversation không
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (!participant) {
      throw new AppError('Bạn không có trong cuộc hội thoại này', 403);
    }

    const { page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }, // Mới nhất trước
        include: {
          sender: { select: { id: true, fullName: true, avatar: true } },
        },
      }),
      prisma.message.count({ where: { conversationId } }),
    ]);

    // Đánh dấu các tin nhắn của đối phương là đã đọc
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    });

    return { messages: messages.reverse(), total }; // Đảo ngược để tin cũ ở trên
  },

  /**
   * Gửi tin nhắn text
   * Được gọi bởi Socket.IO handler
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    fileUrl?: string,
    fileType?: string
  ) {
    // Kiểm tra sender có trong conversation
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: senderId } },
    });

    if (!participant) {
      throw new AppError('Bạn không có trong cuộc hội thoại', 403);
    }

    // Tạo tin nhắn
    const message = await prisma.message.create({
      data: { conversationId, senderId, content, fileUrl, fileType },
      include: {
        sender: { select: { id: true, fullName: true, avatar: true } },
      },
    });

    // Cập nhật lastMessage trong conversation
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: content || (fileUrl ? '📎 File đính kèm' : ''),
        lastMessageAt: new Date(),
      },
    });

    return message;
  },
};

// ============================================================
// ROUTES
// ============================================================
const router = Router();
router.use(authenticate);

/** GET /api/v1/chat/conversations - Danh sách conversations */
router.get('/conversations', async (req: AuthenticatedRequest, res: Response) => {
  const conversations = await chatService.getConversations(req.user!.id);
  sendSuccess(res, conversations, 'Lấy danh sách chat thành công');
});

/** POST /api/v1/chat/conversations/:userId - Tạo/mở conversation với user khác */
router.post('/conversations/:userId', async (req: AuthenticatedRequest, res: Response) => {
  const conversation = await chatService.getOrCreateConversation(
    req.user!.id,
    req.params.userId
  );
  sendSuccess(res, conversation, 'Mở cuộc hội thoại thành công');
});

/** GET /api/v1/chat/conversations/:conversationId/messages - Lịch sử tin nhắn */
router.get(
  '/conversations/:conversationId/messages',
  async (req: AuthenticatedRequest, res: Response) => {
    const { page = '1', limit = '50' } = req.query as { page?: string; limit?: string };
    const { messages, total } = await chatService.getMessages(
      req.params.conversationId,
      req.user!.id,
      { page: parseInt(page), limit: parseInt(limit) }
    );
    sendSuccess(res, { messages, total }, 'Lấy lịch sử chat thành công');
  }
);

/** POST /api/v1/chat/conversations/:conversationId/images - Upload ảnh trong chat */
router.post(
  '/conversations/:conversationId/images',
  upload.single('image'),
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'Vui lòng chọn ảnh' });
      return;
    }
    // Upload ảnh lên Cloudinary
    const uploaded = await uploadToCloudinary(req.file.buffer, 'chat');

    // Gửi tin nhắn với URL ảnh
    const message = await chatService.sendMessage(
      req.params.conversationId,
      req.user!.id,
      '',
      uploaded.url,
      'image'
    );
    sendSuccess(res, message, 'Gửi ảnh thành công');
  }
);

export default router;
