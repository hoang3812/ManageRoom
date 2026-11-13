/**
 * modules/dashboard/dashboard.routes.ts
 * Dashboard thống kê tổng quan cho OWNER/STAFF
 */

import { Router, Response } from 'express';
import prisma from '../../config/database';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { aiService } from '../ai/ai.service';

const router = Router();
router.use(authenticate, authorize('OWNER', 'STAFF'));

/**
 * GET /api/v1/dashboard/overview
 * Tổng quan hệ thống: phòng, hợp đồng, doanh thu, bảo trì
 */
router.get('/overview', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const stats = await aiService.getOwnerStats(userId);

  // Thống kê doanh thu tháng này vs tháng trước
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [currentMonthRevenue, lastMonthRevenue] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        status: 'SUCCESS',
        paidAt: { gte: startOfMonth },
        invoice: { contract: { room: { property: { ownerId: userId } } } },
      },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: {
        status: 'SUCCESS',
        paidAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        invoice: { contract: { room: { property: { ownerId: userId } } } },
      },
      _sum: { amount: true },
    }),
  ]);

  const currentRevenue = currentMonthRevenue._sum.amount || 0;
  const lastRevenue = lastMonthRevenue._sum.amount || 0;
  const revenueGrowth = lastRevenue > 0
    ? ((currentRevenue - lastRevenue) / lastRevenue) * 100
    : 0;

  sendSuccess(res, {
    ...stats,
    currentMonthRevenue: currentRevenue,
    lastMonthRevenue: lastRevenue,
    revenueGrowth: Math.round(revenueGrowth * 10) / 10,
  }, 'Lấy tổng quan thành công');
});

/**
 * GET /api/v1/dashboard/revenue-chart?year=2024
 * Biểu đồ doanh thu theo tháng trong năm
 */
router.get('/revenue-chart', async (req: AuthenticatedRequest, res: Response) => {
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const userId = req.user!.id;

  const payments = await prisma.payment.findMany({
    where: {
      status: 'SUCCESS',
      paidAt: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      },
      invoice: { contract: { room: { property: { ownerId: userId } } } },
    },
    select: { amount: true, paidAt: true, method: true },
  });

  // Nhóm theo tháng
  const monthlyData: Record<number, { total: number; cash: number; vnpay: number; transfer: number }> = {};
  for (let i = 1; i <= 12; i++) {
    monthlyData[i] = { total: 0, cash: 0, vnpay: 0, transfer: 0 };
  }

  for (const payment of payments) {
    const month = payment.paidAt!.getMonth() + 1;
    monthlyData[month].total += payment.amount;
    if (payment.method === 'CASH') monthlyData[month].cash += payment.amount;
    else if (payment.method === 'VNPAY') monthlyData[month].vnpay += payment.amount;
    else monthlyData[month].transfer += payment.amount;
  }

  const chartData = Object.entries(monthlyData).map(([month, data]) => ({
    month: parseInt(month),
    label: `T${month}`,
    ...data,
  }));

  sendSuccess(res, { year, chartData }, 'Lấy biểu đồ doanh thu thành công');
});

/**
 * GET /api/v1/dashboard/room-status
 * Biểu đồ trạng thái phòng (pie chart)
 */
router.get('/room-status', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const roomStats = await prisma.room.groupBy({
    by: ['status'],
    where: { property: { ownerId: userId } },
    _count: true,
  });

  const data = {
    available: roomStats.find((r) => r.status === 'AVAILABLE')?._count || 0,
    occupied: roomStats.find((r) => r.status === 'OCCUPIED')?._count || 0,
    maintenance: roomStats.find((r) => r.status === 'MAINTENANCE')?._count || 0,
    inactive: roomStats.find((r) => r.status === 'INACTIVE')?._count || 0,
  };

  sendSuccess(res, data, 'Lấy trạng thái phòng thành công');
});

/**
 * GET /api/v1/dashboard/recent-activities
 * Hoạt động gần đây (hóa đơn mới, thanh toán, báo hỏng)
 */
router.get('/recent-activities', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const limit = 10;

  const [recentPayments, recentMaintenance, recentContracts] = await Promise.all([
    // 10 thanh toán gần nhất
    prisma.payment.findMany({
      where: {
        status: 'SUCCESS',
        invoice: { contract: { room: { property: { ownerId: userId } } } },
      },
      orderBy: { paidAt: 'desc' },
      take: limit,
      select: {
        paymentCode: true,
        amount: true,
        method: true,
        paidAt: true,
        invoice: {
          select: {
            contract: {
              select: {
                room: { select: { roomNumber: true } },
                tenant: { include: { user: { select: { fullName: true } } } },
              },
            },
          },
        },
      },
    }),
    // Báo hỏng mới
    prisma.maintenanceRequest.findMany({
      where: { room: { property: { ownerId: userId } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        requestCode: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
        room: { select: { roomNumber: true } },
      },
    }),
    // Hợp đồng mới
    prisma.contract.findMany({
      where: { room: { property: { ownerId: userId } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        contractCode: true,
        status: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        room: { select: { roomNumber: true } },
        tenant: { include: { user: { select: { fullName: true } } } },
      },
    }),
  ]);

  sendSuccess(res, {
    recentPayments,
    recentMaintenance,
    recentContracts,
  }, 'Lấy hoạt động gần đây thành công');
});

/**
 * GET /api/v1/dashboard/expiring-contracts
 * Hợp đồng sắp hết hạn trong 30 ngày
 */
router.get('/expiring-contracts', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const days = parseInt(req.query.days as string) || 30;
  const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const contracts = await prisma.contract.findMany({
    where: {
      status: 'ACTIVE',
      endDate: { lte: endDate, gte: new Date() },
      room: { property: { ownerId: userId } },
    },
    orderBy: { endDate: 'asc' },
    include: {
      room: {
        select: {
          roomNumber: true,
          property: { select: { name: true } },
        },
      },
      tenant: {
        include: {
          user: { select: { fullName: true, phone: true, email: true } },
        },
      },
    },
  });

  sendSuccess(res, contracts, `Hợp đồng hết hạn trong ${days} ngày`);
});

export default router;
