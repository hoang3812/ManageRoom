/**
 * modules/contracts/contract.service.ts
 * Business logic cho Contract Management module
 * Xử lý: tạo, gia hạn, chấm dứt hợp đồng; cập nhật trạng thái phòng
 */

import prisma from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import { calculateSkip } from '../../utils/response';
import { generateContractCode, getNextSequence } from '../../utils/code-generator';
import {
  CreateContractDto,
  RenewContractDto,
  TerminateContractDto,
} from './contract.schema';

export const contractService = {
  /**
   * Tạo hợp đồng mới
   * 1. Kiểm tra phòng có available không
   * 2. Kiểm tra tenant tồn tại
   * 3. Tạo hợp đồng với mã tự động
   * 4. Cập nhật trạng thái phòng thành OCCUPIED
   */
  async createContract(ownerId: string, data: CreateContractDto) {
    // Kiểm tra quyền của owner với phòng này
    const room = await prisma.room.findFirst({
      where: {
        id: data.roomId,
        property: { ownerId },
        status: 'AVAILABLE', // Chỉ tạo hợp đồng cho phòng trống
      },
    });

    if (!room) {
      throw new AppError(
        'Phòng không tồn tại, không thuộc quyền quản lý, hoặc không sẵn sàng cho thuê',
        400
      );
    }

    // Kiểm tra tenant tồn tại
    const tenant = await prisma.tenant.findUnique({
      where: { id: data.tenantId },
    });
    if (!tenant) throw new AppError('Không tìm thấy người thuê', 404);

    // Đếm số hợp đồng hôm nay để tạo mã tự động
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const contractCount = await prisma.contract.count({
      where: { createdAt: { gte: today } },
    });

    const contractCode = generateContractCode(getNextSequence(contractCount));

    // Sử dụng transaction để đảm bảo tính nhất quán dữ liệu
    const contract = await prisma.$transaction(async (tx) => {
      // Tạo hợp đồng
      const newContract = await tx.contract.create({
        data: {
          contractCode,
          roomId: data.roomId,
          tenantId: data.tenantId,
          startDate: data.startDate,
          endDate: data.endDate,
          monthlyRent: data.monthlyRent,
          deposit: data.deposit,
          depositPaid: data.depositPaid,
          terms: data.terms,
          status: 'ACTIVE',
        },
        include: {
          room: {
            select: { roomNumber: true, property: { select: { name: true } } },
          },
          tenant: {
            include: {
              user: { select: { fullName: true, email: true, phone: true } },
            },
          },
        },
      });

      // Cập nhật trạng thái phòng thành OCCUPIED
      await tx.room.update({
        where: { id: data.roomId },
        data: { status: 'OCCUPIED' },
      });

      return newContract;
    });

    return contract;
  },

  /**
   * Lấy danh sách hợp đồng (lọc theo property hoặc owner)
   */
  async listContracts(
    userId: string,
    query: {
      page: number;
      limit: number;
      status?: string;
      propertyId?: string;
      search?: string;
    }
  ) {
    const { page = 1, limit = 10, status, propertyId, search } = query;
    const skip = calculateSkip(page, limit);

    const where = {
      room: {
        property: {
          OR: [
            { ownerId: userId },
            { staff: { some: { id: userId } } },
          ],
          ...(propertyId && { id: propertyId }),
        },
      },
      ...(status && { status: status as 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'PENDING' }),
      ...(search && {
        OR: [
          { contractCode: { contains: search, mode: 'insensitive' as const } },
          {
            tenant: {
              user: {
                fullName: { contains: search, mode: 'insensitive' as const },
              },
            },
          },
        ],
      }),
    };

    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          room: {
            select: {
              roomNumber: true,
              floor: true,
              property: { select: { name: true } },
            },
          },
          tenant: {
            include: {
              user: { select: { fullName: true, phone: true, avatar: true } },
            },
          },
        },
      }),
      prisma.contract.count({ where }),
    ]);

    return { contracts, total };
  },

  /**
   * Lấy hợp đồng của tenant đang đăng nhập
   */
  async getTenantContracts(userId: string) {
    const tenant = await prisma.tenant.findUnique({ where: { userId } });
    if (!tenant) return [];

    return prisma.contract.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
      include: {
        room: {
          select: {
            roomNumber: true,
            floor: true,
            area: true,
            property: { select: { name: true, address: true } },
          },
        },
      },
    });
  },

  /**
   * Lấy chi tiết hợp đồng
   */
  async getContractById(contractId: string, userId: string) {
    const contract = await prisma.contract.findFirst({
      where: {
        id: contractId,
        OR: [
          // Owner hoặc staff của property
          {
            room: {
              property: {
                OR: [
                  { ownerId: userId },
                  { staff: { some: { id: userId } } },
                ],
              },
            },
          },
          // Tenant của hợp đồng
          { tenant: { userId } },
        ],
      },
      include: {
        room: {
          include: {
            property: { select: { name: true, address: true } },
            roomType: true,
          },
        },
        tenant: {
          include: {
            user: { select: { fullName: true, email: true, phone: true, avatar: true } },
          },
        },
        invoices: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 5,
          select: {
            id: true,
            invoiceCode: true,
            month: true,
            year: true,
            totalAmount: true,
            status: true,
            dueDate: true,
          },
        },
      },
    });

    if (!contract) throw new AppError('Không tìm thấy hợp đồng', 404);
    return contract;
  },

  /**
   * Gia hạn hợp đồng
   * Cập nhật ngày kết thúc và giá thuê mới (nếu có)
   */
  async renewContract(contractId: string, userId: string, data: RenewContractDto) {
    const contract = await prisma.contract.findFirst({
      where: {
        id: contractId,
        status: 'ACTIVE',
        room: { property: { ownerId: userId } },
      },
    });

    if (!contract) {
      throw new AppError('Không tìm thấy hợp đồng active hoặc không có quyền', 404);
    }

    if (data.newEndDate <= contract.endDate) {
      throw new AppError('Ngày gia hạn phải sau ngày kết thúc hiện tại', 400);
    }

    return prisma.contract.update({
      where: { id: contractId },
      data: {
        endDate: data.newEndDate,
        ...(data.newMonthlyRent && { monthlyRent: data.newMonthlyRent }),
      },
    });
  },

  /**
   * Chấm dứt hợp đồng trước hạn
   * 1. Cập nhật status hợp đồng thành TERMINATED
   * 2. Cập nhật trạng thái phòng thành AVAILABLE
   */
  async terminateContract(
    contractId: string,
    userId: string,
    data: TerminateContractDto
  ) {
    const contract = await prisma.contract.findFirst({
      where: {
        id: contractId,
        status: 'ACTIVE',
        room: { property: { ownerId: userId } },
      },
    });

    if (!contract) {
      throw new AppError('Không tìm thấy hợp đồng hoặc không có quyền', 404);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Cập nhật hợp đồng
      const updatedContract = await tx.contract.update({
        where: { id: contractId },
        data: {
          status: 'TERMINATED',
          endDate: data.terminationDate || new Date(),
          terms: contract.terms
            ? `${contract.terms}\n\nLý do chấm dứt: ${data.reason}`
            : `Lý do chấm dứt: ${data.reason}`,
        },
      });

      // Cập nhật phòng về AVAILABLE
      await tx.room.update({
        where: { id: contract.roomId },
        data: { status: 'AVAILABLE' },
      });

      return updatedContract;
    });

    return result;
  },

  /**
   * Tự động kiểm tra và cập nhật hợp đồng hết hạn
   * Chạy bởi cron job hàng ngày
   */
  async processExpiredContracts() {
    const expiredContracts = await prisma.contract.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { lt: new Date() }, // Ngày kết thúc đã qua
      },
    });

    for (const contract of expiredContracts) {
      await prisma.$transaction(async (tx) => {
        await tx.contract.update({
          where: { id: contract.id },
          data: { status: 'EXPIRED' },
        });
        await tx.room.update({
          where: { id: contract.roomId },
          data: { status: 'AVAILABLE' },
        });
      });
    }

    return expiredContracts.length;
  },
};
