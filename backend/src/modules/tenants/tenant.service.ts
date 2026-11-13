/**
 * modules/tenants/tenant.service.ts
 * Business logic cho Tenant Management module
 * Quản lý hồ sơ người thuê, xem lịch sử thuê phòng
 */

import prisma from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import { calculateSkip } from '../../utils/response';
import { UpdateTenantProfileDto } from './tenant.schema';
import { uploadToCloudinary } from '../../middlewares/upload.middleware';

export const tenantService = {
  /**
   * Lấy hoặc tạo hồ sơ tenant cho user
   * Khi người dùng có role TENANT đăng nhập lần đầu, hệ thống tự tạo Tenant record
   */
  async getOrCreateTenantProfile(userId: string) {
    // Tìm tenant hiện có
    let tenant = await prisma.tenant.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            avatar: true,
          },
        },
      },
    });

    // Nếu chưa có, tạo mới (lazy creation)
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: { userId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              phone: true,
              avatar: true,
            },
          },
        },
      });
    }

    return tenant;
  },

  /**
   * Cập nhật hồ sơ tenant (CCCD, ngày sinh, địa chỉ thường trú...)
   */
  async updateTenantProfile(userId: string, data: UpdateTenantProfileDto) {
    // Đảm bảo tenant record tồn tại
    const tenant = await tenantService.getOrCreateTenantProfile(userId);

    return prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        ...(data.idCardNumber && { idCardNumber: data.idCardNumber }),
        ...(data.birthDate && { birthDate: data.birthDate }),
        ...(data.permanentAddress !== undefined && { permanentAddress: data.permanentAddress }),
        ...(data.occupation !== undefined && { occupation: data.occupation }),
        ...(data.emergencyContact !== undefined && { emergencyContact: data.emergencyContact }),
        ...(data.emergencyPhone !== undefined && { emergencyPhone: data.emergencyPhone }),
      },
    });
  },

  /**
   * Upload ảnh mặt trước/sau CCCD
   */
  async uploadIdCard(
    userId: string,
    frontBuffer?: Buffer,
    backBuffer?: Buffer
  ) {
    const tenant = await tenantService.getOrCreateTenantProfile(userId);
    const updateData: { idCardFront?: string; idCardBack?: string } = {};

    if (frontBuffer) {
      const result = await uploadToCloudinary(frontBuffer, 'id-cards');
      updateData.idCardFront = result.url;
    }

    if (backBuffer) {
      const result = await uploadToCloudinary(backBuffer, 'id-cards');
      updateData.idCardBack = result.url;
    }

    return prisma.tenant.update({
      where: { id: tenant.id },
      data: updateData,
    });
  },

  /**
   * Lấy danh sách tất cả người thuê (dành cho OWNER/STAFF)
   * Bao gồm thông tin hợp đồng đang active
   */
  async listTenants(
    propertyId: string | undefined,
    query: { page: number; limit: number; search?: string }
  ) {
    const { page = 1, limit = 10, search } = query;
    const skip = calculateSkip(page, limit);

    // Nếu có propertyId, lọc tenant thuộc khu trọ đó
    const contractFilter = propertyId
      ? { contracts: { some: { room: { propertyId }, status: 'ACTIVE' as const } } }
      : {};

    const where = {
      ...contractFilter,
      ...(search && {
        user: {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search } },
          ],
        },
      }),
    };

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              phone: true,
              avatar: true,
              isActive: true,
            },
          },
          // Hợp đồng đang active
          contracts: {
            where: { status: 'ACTIVE' },
            include: {
              room: {
                select: {
                  roomNumber: true,
                  property: { select: { name: true } },
                },
              },
            },
            take: 1,
          },
        },
      }),
      prisma.tenant.count({ where }),
    ]);

    return { tenants, total };
  },

  /**
   * Lấy chi tiết một tenant theo ID
   */
  async getTenantById(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            avatar: true,
          },
        },
        // Toàn bộ lịch sử hợp đồng
        contracts: {
          include: {
            room: {
              select: {
                roomNumber: true,
                floor: true,
                property: { select: { name: true, address: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!tenant) throw new AppError('Không tìm thấy người thuê', 404);
    return tenant;
  },
};
