/**
 * modules/ai/ai.service.ts
 * AI Assistant sử dụng Google Gemini API
 * Hỗ trợ: trả lời câu hỏi, phân tích doanh thu, gợi ý quản lý
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env';
import prisma from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import logger from '../../utils/logger';

// Khởi tạo Gemini client
const getGeminiClient = () => {
  if (!env.GEMINI_API_KEY) {
    throw new AppError('AI chưa được cấu hình (GEMINI_API_KEY)', 503);
  }
  return new GoogleGenerativeAI(env.GEMINI_API_KEY);
};

export const aiService = {
  /**
   * Trả lời câu hỏi về quản lý phòng trọ
   * AI được cung cấp context về dữ liệu thực của hệ thống
   */
  async chat(userId: string, question: string): Promise<string> {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Lấy context dữ liệu thực của owner
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, fullName: true },
    });

    let systemContext = `Bạn là trợ lý AI của hệ thống Quản lý Phòng trọ RMS (Rental Management System).
Bạn hỗ trợ chủ trọ, nhân viên và người thuê với các câu hỏi về quản lý phòng trọ.
Người dùng hiện tại: ${user?.fullName} (Vai trò: ${user?.role === 'OWNER' ? 'Chủ trọ' : user?.role === 'STAFF' ? 'Nhân viên' : 'Người thuê'})
Trả lời bằng tiếng Việt, ngắn gọn, chuyên nghiệp và hữu ích.`;

    // Thêm dữ liệu thống kê nếu là OWNER/STAFF
    if (user?.role === 'OWNER' || user?.role === 'STAFF') {
      try {
        const stats = await aiService.getOwnerStats(userId);
        systemContext += `\n\nDữ liệu hiện tại của hệ thống:
- Tổng số phòng: ${stats.totalRooms}
- Phòng đang có người thuê: ${stats.occupiedRooms}
- Tỷ lệ lấp đầy: ${stats.occupancyRate.toFixed(1)}%
- Hóa đơn chưa thanh toán: ${stats.unpaidInvoices} hóa đơn
- Tổng công nợ: ${stats.totalDebt.toLocaleString('vi-VN')}đ
- Yêu cầu bảo trì đang chờ: ${stats.pendingMaintenance}`;
      } catch {
        // Bỏ qua nếu không lấy được stats
      }
    }

    try {
      const result = await model.generateContent(
        `${systemContext}\n\nCâu hỏi: ${question}`
      );
      return result.response.text();
    } catch (error) {
      logger.error('Gemini AI error:', error);
      throw new AppError('AI tạm thời không khả dụng, vui lòng thử lại sau', 503);
    }
  },

  /**
   * Phân tích doanh thu theo tháng và đưa ra nhận xét
   */
  async analyzeRevenue(userId: string, months = 6): Promise<string> {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Lấy dữ liệu doanh thu thực
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const payments = await prisma.payment.findMany({
      where: {
        status: 'SUCCESS',
        createdAt: { gte: startDate },
        invoice: {
          contract: {
            room: {
              property: { ownerId: userId },
            },
          },
        },
      },
      select: {
        amount: true,
        createdAt: true,
        method: true,
      },
    });

    // Nhóm doanh thu theo tháng
    const monthlyRevenue: Record<string, number> = {};
    for (const payment of payments) {
      const key = `${payment.createdAt.getFullYear()}-${String(payment.createdAt.getMonth() + 1).padStart(2, '0')}`;
      monthlyRevenue[key] = (monthlyRevenue[key] || 0) + payment.amount;
    }

    const revenueData = Object.entries(monthlyRevenue)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => `${month}: ${amount.toLocaleString('vi-VN')}đ`)
      .join('\n');

    const prompt = `Phân tích dữ liệu doanh thu sau và đưa ra nhận xét, xu hướng và gợi ý cải thiện:

Doanh thu ${months} tháng gần đây:
${revenueData || 'Chưa có dữ liệu'}

Hãy phân tích:
1. Xu hướng doanh thu (tăng/giảm/ổn định)
2. Tháng tốt nhất và kém nhất
3. Gợi ý để tăng doanh thu
4. Những điểm cần chú ý

Trả lời bằng tiếng Việt, súc tích và thực tế.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  },

  /**
   * Gợi ý quản lý dựa trên tình trạng hiện tại
   */
  async getSuggestions(userId: string): Promise<string> {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const stats = await aiService.getOwnerStats(userId);

    const prompt = `Dựa trên tình trạng quản lý phòng trọ sau, hãy đưa ra 5 gợi ý cụ thể để cải thiện:

Thống kê hiện tại:
- Tổng phòng: ${stats.totalRooms}, Đang thuê: ${stats.occupiedRooms}, Trống: ${stats.availableRooms}
- Tỷ lệ lấp đầy: ${stats.occupancyRate.toFixed(1)}%
- Hóa đơn quá hạn: ${stats.overdueInvoices}
- Tổng công nợ quá hạn: ${stats.overdueDebt.toLocaleString('vi-VN')}đ
- Yêu cầu bảo trì đang chờ: ${stats.pendingMaintenance}
- Hợp đồng sắp hết hạn (30 ngày): ${stats.expiringContracts}

Đưa ra gợi ý theo thứ tự ưu tiên, mỗi gợi ý kèm lý do và cách thực hiện cụ thể.
Trả lời bằng tiếng Việt.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  },

  /**
   * Lấy thống kê tổng hợp cho owner
   */
  async getOwnerStats(userId: string) {
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [roomStats, invoiceStats, maintenanceStats, expiringContracts] =
      await Promise.all([
        // Thống kê phòng
        prisma.room.groupBy({
          by: ['status'],
          where: { property: { ownerId: userId } },
          _count: true,
        }),
        // Thống kê hóa đơn
        prisma.invoice.groupBy({
          by: ['status'],
          where: { contract: { room: { property: { ownerId: userId } } } },
          _count: true,
          _sum: { totalAmount: true },
        }),
        // Bảo trì đang chờ
        prisma.maintenanceRequest.count({
          where: {
            status: 'PENDING',
            room: { property: { ownerId: userId } },
          },
        }),
        // Hợp đồng sắp hết hạn
        prisma.contract.count({
          where: {
            status: 'ACTIVE',
            endDate: { lte: thirtyDaysLater, gte: now },
            room: { property: { ownerId: userId } },
          },
        }),
      ]);

    const totalRooms = roomStats.reduce((sum, r) => sum + r._count, 0);
    const occupiedRooms = roomStats.find((r) => r.status === 'OCCUPIED')?._count || 0;
    const availableRooms = roomStats.find((r) => r.status === 'AVAILABLE')?._count || 0;

    const overdueData = invoiceStats.find((i) => i.status === 'OVERDUE');
    const sentData = invoiceStats.find((i) => i.status === 'SENT');

    return {
      totalRooms,
      occupiedRooms,
      availableRooms,
      occupancyRate: totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0,
      unpaidInvoices: (overdueData?._count || 0) + (sentData?._count || 0),
      overdueInvoices: overdueData?._count || 0,
      totalDebt: (overdueData?._sum.totalAmount || 0) + (sentData?._sum.totalAmount || 0),
      overdueDebt: overdueData?._sum.totalAmount || 0,
      pendingMaintenance: maintenanceStats,
      expiringContracts,
    };
  },
};
