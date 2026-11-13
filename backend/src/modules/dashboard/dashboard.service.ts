import prisma from '../../config/database';
import { buildPaginationMeta, calculateSkip } from '../../utils/response';
import dayjs from 'dayjs';

export const getDashboardStats = async (ownerId: string) => {
  const properties = await prisma.property.findMany({
    where: { ownerId },
    select: { id: true },
  });
  const propertyIds = properties.map(p => p.id);

  const now = new Date();
  const startOfMonth = dayjs().startOf('month').toDate();
  const endOfMonth = dayjs().endOf('month').toDate();
  const thirtyDaysLater = dayjs().add(30, 'day').toDate();

  const [
    totalRooms, occupiedRooms, availableRooms,
    monthlyRevenue, overdueInvoices, pendingMaintenance,
    expiringContracts, totalTenants,
  ] = await Promise.all([
    prisma.room.count({ where: { propertyId: { in: propertyIds } } }),
    prisma.room.count({ where: { propertyId: { in: propertyIds }, status: 'OCCUPIED' } }),
    prisma.room.count({ where: { propertyId: { in: propertyIds }, status: 'AVAILABLE' } }),
    prisma.payment.aggregate({
      where: {
        status: 'SUCCESS',
        paidAt: { gte: startOfMonth, lte: endOfMonth },
        invoice: { contract: { room: { propertyId: { in: propertyIds } } } },
      },
      _sum: { amount: true },
    }),
    prisma.invoice.count({
      where: {
        status: 'OVERDUE',
        contract: { room: { propertyId: { in: propertyIds } } },
      },
    }),
    prisma.maintenanceRequest.count({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        room: { propertyId: { in: propertyIds } },
      },
    }),
    prisma.contract.count({
      where: {
        status: 'ACTIVE',
        endDate: { gte: now, lte: thirtyDaysLater },
        room: { propertyId: { in: propertyIds } },
      },
    }),
    prisma.tenant.count({
      where: { contracts: { some: { status: 'ACTIVE', room: { propertyId: { in: propertyIds } } } } },
    }),
  ]);

  return {
    totalRooms,
    occupiedRooms,
    availableRooms,
    occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
    monthlyRevenue: monthlyRevenue._sum.amount || 0,
    overdueInvoices,
    pendingMaintenance,
    expiringContracts,
    totalTenants,
  };
};

export const getRevenueChart = async (ownerId: string, months = 12) => {
  const properties = await prisma.property.findMany({ where: { ownerId }, select: { id: true } });
  const propertyIds = properties.map(p => p.id);

  const data = [];
  for (let i = months - 1; i >= 0; i--) {
    const date = dayjs().subtract(i, 'month');
    const start = date.startOf('month').toDate();
    const end = date.endOf('month').toDate();

    const result = await prisma.payment.aggregate({
      where: {
        status: 'SUCCESS',
        paidAt: { gte: start, lte: end },
        invoice: { contract: { room: { propertyId: { in: propertyIds } } } },
      },
      _sum: { amount: true },
    });

    data.push({
      month: date.format('MM/YYYY'),
      revenue: result._sum.amount || 0,
    });
  }
  return data;
};

export const getOccupancyByProperty = async (ownerId: string) => {
  const properties = await prisma.property.findMany({
    where: { ownerId },
    include: {
      rooms: { select: { status: true } },
    },
  });

  return properties.map(p => ({
    propertyId: p.id,
    propertyName: p.name,
    total: p.rooms.length,
    occupied: p.rooms.filter(r => r.status === 'OCCUPIED').length,
    available: p.rooms.filter(r => r.status === 'AVAILABLE').length,
    maintenance: p.rooms.filter(r => r.status === 'MAINTENANCE').length,
  }));
};

export const getRecentInvoices = async (ownerId: string, limit = 5) => {
  const properties = await prisma.property.findMany({ where: { ownerId }, select: { id: true } });
  const propertyIds = properties.map(p => p.id);

  return prisma.invoice.findMany({
    where: { contract: { room: { propertyId: { in: propertyIds } } } },
    include: {
      contract: {
        include: {
          tenant: { include: { user: { select: { fullName: true } } } },
          room: { select: { roomNumber: true, property: { select: { name: true } } } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
};
