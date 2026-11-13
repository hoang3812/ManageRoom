import prisma from '../../config/database';
import dayjs from 'dayjs';
import { buildPaginationMeta } from '../../utils/response';

// ── Revenue Report ──────────────────────────────────────────
export const getRevenueReport = async (ownerId: string, fromMonth: number, fromYear: number, toMonth: number, toYear: number) => {
  const properties = await prisma.property.findMany({ where: { ownerId }, select: { id: true, name: true } });
  const propertyIds = properties.map(p => p.id);

  const fromDate = dayjs(`${fromYear}-${String(fromMonth).padStart(2, '0')}-01`).startOf('month').toDate();
  const toDate = dayjs(`${toYear}-${String(toMonth).padStart(2, '0')}-01`).endOf('month').toDate();

  const payments = await prisma.payment.findMany({
    where: {
      status: 'SUCCESS',
      paidAt: { gte: fromDate, lte: toDate },
      invoice: { contract: { room: { propertyId: { in: propertyIds } } } },
    },
    include: {
      invoice: {
        include: {
          contract: {
            include: {
              room: { select: { roomNumber: true, propertyId: true, property: { select: { name: true } } } },
              tenant: { include: { user: { select: { fullName: true } } } },
            },
          },
        },
      },
    },
    orderBy: { paidAt: 'desc' },
  });

  // Group by month
  const byMonth: Record<string, { month: string; revenue: number; count: number }> = {};
  for (const p of payments) {
    const key = dayjs(p.paidAt!).format('MM/YYYY');
    if (!byMonth[key]) byMonth[key] = { month: key, revenue: 0, count: 0 };
    byMonth[key].revenue += p.amount;
    byMonth[key].count++;
  }

  // Group by property
  const byProperty: Record<string, { propertyId: string; propertyName: string; revenue: number }> = {};
  for (const p of payments) {
    const propId = p.invoice.contract.room.propertyId;
    const propName = p.invoice.contract.room.property.name;
    if (!byProperty[propId]) byProperty[propId] = { propertyId: propId, propertyName: propName, revenue: 0 };
    byProperty[propId].revenue += p.amount;
  }

  return {
    totalRevenue: payments.reduce((s, p) => s + p.amount, 0),
    totalTransactions: payments.length,
    byMonth: Object.values(byMonth),
    byProperty: Object.values(byProperty),
    payments,
  };
};

// ── Occupancy Report ──────────────────────────────────────────
export const getOccupancyReport = async (ownerId: string) => {
  const properties = await prisma.property.findMany({
    where: { ownerId },
    include: {
      rooms: {
        include: {
          contracts: {
            where: { status: 'ACTIVE' },
            include: { tenant: { include: { user: { select: { fullName: true, phone: true } } } } },
          },
        },
      },
    },
  });

  return properties.map(p => ({
    propertyId: p.id,
    propertyName: p.name,
    address: p.address,
    rooms: p.rooms.map(r => ({
      roomId: r.id,
      roomNumber: r.roomNumber,
      status: r.status,
      basePrice: r.basePrice,
      tenant: r.contracts[0]?.tenant?.user?.fullName || null,
      tenantPhone: r.contracts[0]?.tenant?.user?.phone || null,
    })),
    summary: {
      total: p.rooms.length,
      occupied: p.rooms.filter(r => r.status === 'OCCUPIED').length,
      available: p.rooms.filter(r => r.status === 'AVAILABLE').length,
      maintenance: p.rooms.filter(r => r.status === 'MAINTENANCE').length,
    },
  }));
};

// ── Debt Report ──────────────────────────────────────────────
export const getDebtReport = async (ownerId: string) => {
  const properties = await prisma.property.findMany({ where: { ownerId }, select: { id: true } });
  const propertyIds = properties.map(p => p.id);

  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      status: { in: ['OVERDUE', 'SENT'] },
      contract: { room: { propertyId: { in: propertyIds } } },
    },
    include: {
      contract: {
        include: {
          tenant: { include: { user: { select: { fullName: true, phone: true, email: true } } } },
          room: { select: { roomNumber: true, property: { select: { name: true } } } },
        },
      },
    },
    orderBy: { dueDate: 'asc' },
  });

  return {
    totalDebt: overdueInvoices.reduce((s, inv) => s + (inv.totalAmount - inv.paidAmount), 0),
    count: overdueInvoices.length,
    invoices: overdueInvoices.map(inv => ({
      invoiceId: inv.id,
      invoiceCode: inv.invoiceCode,
      month: `${inv.month}/${inv.year}`,
      dueDate: inv.dueDate,
      totalAmount: inv.totalAmount,
      paidAmount: inv.paidAmount,
      remainingAmount: inv.totalAmount - inv.paidAmount,
      status: inv.status,
      tenant: inv.contract.tenant.user.fullName,
      tenantPhone: inv.contract.tenant.user.phone,
      room: inv.contract.room.roomNumber,
      property: inv.contract.room.property.name,
    })),
  };
};
