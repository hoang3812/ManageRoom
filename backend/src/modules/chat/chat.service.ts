import prisma from '../../config/database';
import { buildPaginationMeta, calculateSkip } from '../../utils/response';

export const getConversations = async (userId: string) => {
  return prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    include: {
      participants: {
        include: { user: { select: { id: true, fullName: true, avatar: true, role: true } } },
      },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { lastMessageAt: 'desc' },
  });
};

export const getOrCreateConversation = async (userId: string, targetUserId: string) => {
  // Check if conversation already exists between these two users
  const existing = await prisma.conversation.findFirst({
    where: {
      participants: { some: { userId } },
      AND: { participants: { some: { userId: targetUserId } } },
    },
    include: {
      participants: { include: { user: { select: { id: true, fullName: true, avatar: true } } } },
    },
  });
  if (existing) return existing;

  // Create new conversation
  return prisma.conversation.create({
    data: {
      participants: {
        create: [{ userId }, { userId: targetUserId }],
      },
    },
    include: {
      participants: { include: { user: { select: { id: true, fullName: true, avatar: true } } } },
    },
  });
};

export const getMessages = async (
  conversationId: string, userId: string, page: number, limit: number
) => {
  // Verify user is participant
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!participant) throw new Error('Bạn không có quyền xem hội thoại này');

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId },
      include: { sender: { select: { id: true, fullName: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      skip: calculateSkip(page, limit),
      take: limit,
    }),
    prisma.message.count({ where: { conversationId } }),
  ]);

  return { messages: messages.reverse(), meta: buildPaginationMeta(page, limit, total) };
};

export const sendMessage = async (conversationId: string, senderId: string, content: string) => {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: senderId } },
  });
  if (!participant) throw new Error('Bạn không có quyền gửi tin nhắn trong hội thoại này');

  const [message] = await Promise.all([
    prisma.message.create({
      data: { conversationId, senderId, content },
      include: { sender: { select: { id: true, fullName: true, avatar: true } } },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessage: content, lastMessageAt: new Date() },
    }),
  ]);
  return message;
};
