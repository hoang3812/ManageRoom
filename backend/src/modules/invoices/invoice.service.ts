/**
 * modules/invoices/invoice.service.ts
 * Business logic cho Invoice Management (quản lý hóa đơn)
 * Sinh hóa đơn hàng tháng, quản lý công nợ
 */

import prisma from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import { calculateSkip } from '../../utils/response';
import { generateInvoiceCode, getNextSequence } from '../../utils/code-generator';
import { emailService } from '../../services/email.service';
import logger from '../../utils/logger';

export const invoiceService = {
  /**
   * Sinh hóa đơn cho một phòng trong tháng
   * Tổng hợp: tiền phòng + điện + nước + phí dịch vụ
   */
  async generateInvoice(
    contractId: string,
    month: number,
    year: number,
    userId: string
  ) {
    // Lấy thông tin hợp đồng
    const contract = await prisma.contract.findFirst({
      where: {
        id: contractId,
        status: 'ACTIVE',
        room: { property: { ownerId: userId } },
      },
      include: {
        room: {
          include: {
            property: {
              include: { serviceFees: { where: { isActive: true } } },
            },
          },
        },
        tenant: {
          include: {
            user: { select: { email: true, fullName: true } },
          },
        },
      },
    });

    if (!contract) {
      throw new AppError('Không tìm thấy hợp đồng hoặc không có quyền', 404);
    }

    // Kiểm tra hóa đơn tháng này chưa tồn tại
    const existingInvoice = await prisma.invoice.findUnique({
      where: {
        contractId_month_year: { contractId, month, year },
      },
    });
    if (existingInvoice) {
      throw new AppError(`Hóa đơn tháng ${month}/${year} đã tồn tại`, 409);
    }

    // Lấy chỉ số điện nước của tháng này
    const utilityReading = await prisma.utilityReading.findUnique({
      where: {
        roomId_month_year: {
          roomId: contract.roomId,
          month,
          year,
        },
      },
    });

    // Tạo mã hóa đơn
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const invoiceCount = await prisma.invoice.count({
      where: { createdAt: { gte: today } },
    });
    const invoiceCode = generateInvoiceCode(getNextSequence(invoiceCount));

    // Ngày đến hạn: ngày 10 tháng sau
    const dueDate = new Date(year, month, 10); // month là 0-indexed, nên month=tháng hiện tại là tháng sau

    // Tính các khoản phí
    const items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      amount: number;
      serviceFeeId?: string;
    }> = [];

    // 1. Tiền thuê phòng
    items.push({
      description: `Tiền thuê phòng ${contract.room.roomNumber} tháng ${month}/${year}`,
      quantity: 1,
      unitPrice: contract.monthlyRent,
      amount: contract.monthlyRent,
    });

    // 2. Tiền điện (nếu có chỉ số)
    if (utilityReading) {
      const electricUsage = utilityReading.electricCurr - utilityReading.electricPrev;
      const electricAmount = electricUsage * utilityReading.electricRate;

      if (electricUsage > 0) {
        items.push({
          description: `Tiền điện: ${electricUsage} kWh x ${utilityReading.electricRate.toLocaleString('vi-VN')} đ`,
          quantity: electricUsage,
          unitPrice: utilityReading.electricRate,
          amount: electricAmount,
        });
      }

      // 3. Tiền nước
      const waterUsage = utilityReading.waterCurr - utilityReading.waterPrev;
      const waterAmount = waterUsage * utilityReading.waterRate;

      if (waterUsage > 0) {
        items.push({
          description: `Tiền nước: ${waterUsage} m³ x ${utilityReading.waterRate.toLocaleString('vi-VN')} đ`,
          quantity: waterUsage,
          unitPrice: utilityReading.waterRate,
          amount: waterAmount,
        });
      }
    }

    // 4. Phí dịch vụ của khu trọ
    const serviceFees = contract.room.property.serviceFees;
    for (const fee of serviceFees) {
      items.push({
        description: fee.name,
        quantity: 1,
        unitPrice: fee.amount,
        amount: fee.amount,
        serviceFeeId: fee.id,
      });
    }

    // Tổng tiền
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

    // Tạo hóa đơn trong transaction
    const invoice = await prisma.$transaction(async (tx) => {
      const newInvoice = await tx.invoice.create({
        data: {
          invoiceCode,
          contractId,
          month,
          year,
          dueDate,
          totalAmount,
          status: 'SENT', // Mặc định là SENT sau khi sinh
          items: {
            create: items,
          },
        },
        include: {
          items: true,
          contract: {
            include: {
              room: {
                select: {
                  roomNumber: true,
                  property: { select: { name: true } },
                },
              },
            },
          },
        },
      });

      // Liên kết chỉ số điện nước với hóa đơn
      if (utilityReading && !utilityReading.invoiceId) {
        await tx.utilityReading.update({
          where: { id: utilityReading.id },
          data: { invoiceId: newInvoice.id },
        });
      }

      return newInvoice;
    });

    // Gửi email thông báo hóa đơn cho tenant (async, không block)
    emailService
      .sendInvoiceNotification(
        contract.tenant.user.email,
        contract.tenant.user.fullName,
        invoiceCode,
        totalAmount,
        dueDate.toLocaleDateString('vi-VN'),
        contract.room.roomNumber
      )
      .catch((err) => logger.error('Gửi email hóa đơn thất bại:', err));

    return invoice;
  },

  /**
   * Sinh hóa đơn hàng loạt cho toàn bộ khu trọ
   */
  async generateBulkInvoices(
    propertyId: string,
    month: number,
    year: number,
    userId: string
  ) {
    // Lấy tất cả hợp đồng đang active trong khu trọ
    const contracts = await prisma.contract.findMany({
      where: {
        status: 'ACTIVE',
        room: { propertyId },
        room2: { property: { ownerId: userId } },
      },
      select: { id: true },
    });

    const results = { success: 0, failed: 0, skipped: 0, errors: [] as string[] };

    for (const contract of contracts) {
      try {
        // Kiểm tra hóa đơn đã tồn tại chưa
        const exists = await prisma.invoice.findUnique({
          where: {
            contractId_month_year: {
              contractId: contract.id,
              month,
              year,
            },
          },
        });

        if (exists) {
          results.skipped++;
          continue;
        }

        await invoiceService.generateInvoice(contract.id, month, year, userId);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Contract ${contract.id}: ${(error as Error).message}`);
      }
    }

    return results;
  },

  /**
   * Lấy danh sách hóa đơn
   */
  async listInvoices(
    userId: string,
    query: {
      page: number;
      limit: number;
      status?: string;
      month?: number;
      year?: number;
      propertyId?: string;
    }
  ) {
    const { page = 1, limit = 10, status, month, year, propertyId } = query;
    const skip = calculateSkip(page, limit);

    const where = {
      contract: {
        room: {
          property: {
            OR: [
              { ownerId: userId },
              { staff: { some: { id: userId } } },
            ],
            ...(propertyId && { id: propertyId }),
          },
        },
      },
      ...(status && { status: status as 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED' }),
      ...(month && { month }),
      ...(year && { year }),
    };

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        include: {
          contract: {
            select: {
              room: {
                select: {
                  roomNumber: true,
                  property: { select: { name: true } },
                },
              },
              tenant: {
                include: {
                  user: { select: { fullName: true, phone: true } },
                },
              },
            },
          },
          _count: { select: { payments: true } },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    return { invoices, total };
  },

  /**
   * Lấy hóa đơn của tenant đang đăng nhập
   */
  async getTenantInvoices(
    userId: string,
    query: { page: number; limit: number; status?: string }
  ) {
    const { page = 1, limit = 10, status } = query;
    const skip = calculateSkip(page, limit);

    const where = {
      contract: { tenant: { userId } },
      ...(status && { status: status as 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED' }),
    };

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        include: {
          items: true,
          contract: {
            select: {
              room: {
                select: {
                  roomNumber: true,
                  property: { select: { name: true } },
                },
              },
            },
          },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    return { invoices, total };
  },

  /**
   * Lấy chi tiết hóa đơn
   */
  async getInvoiceById(invoiceId: string, userId: string) {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        OR: [
          {
            contract: {
              room: {
                property: {
                  OR: [
                    { ownerId: userId },
                    { staff: { some: { id: userId } } },
                  ],
                },
              },
            },
          },
          { contract: { tenant: { userId } } },
        ],
      },
      include: {
        items: {
          include: { serviceFee: true },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        utilityReading: true,
        contract: {
          include: {
            room: {
              include: {
                property: { select: { name: true, address: true } },
              },
            },
            tenant: {
              include: {
                user: { select: { fullName: true, email: true, phone: true } },
              },
            },
          },
        },
      },
    });

    if (!invoice) throw new AppError('Không tìm thấy hóa đơn', 404);
    return invoice;
  },

  /**
   * Đánh dấu hóa đơn quá hạn
   * Chạy bởi cron job hàng ngày
   */
  async markOverdueInvoices() {
    const result = await prisma.invoice.updateMany({
      where: {
        status: 'SENT',
        dueDate: { lt: new Date() },
      },
      data: { status: 'OVERDUE' },
    });

    logger.info(`Đánh dấu ${result.count} hóa đơn quá hạn`);
    return result.count;
  },

  /**
   * Thống kê công nợ
   */
  async getDebtSummary(userId: string, propertyId?: string) {
    const baseWhere = {
      contract: {
        room: {
          property: {
            OR: [
              { ownerId: userId },
              { staff: { some: { id: userId } } },
            ],
            ...(propertyId && { id: propertyId }),
          },
        },
      },
    };

    const [totalOverdue, totalSent] = await Promise.all([
      // Tổng công nợ quá hạn
      prisma.invoice.aggregate({
        where: { ...baseWhere, status: 'OVERDUE' },
        _sum: { totalAmount: true },
        _count: true,
      }),
      // Tổng chưa thanh toán (SENT)
      prisma.invoice.aggregate({
        where: { ...baseWhere, status: 'SENT' },
        _sum: { totalAmount: true },
        _count: true,
      }),
    ]);

    return {
      overdueAmount: totalOverdue._sum.totalAmount || 0,
      overdueCount: totalOverdue._count,
      pendingAmount: totalSent._sum.totalAmount || 0,
      pendingCount: totalSent._count,
    };
  },
};
