/**
 * modules/properties/property.service.ts
 * Business logic cho Quản lý Khu trọ, Tòa nhà, Tầng, Phòng
 * Chứa các thao tác CRUD cho Property và Room
 */

import prisma from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import { calculateSkip } from '../../utils/response';
import {
  CreatePropertyDto,
  UpdatePropertyDto,
  CreateRoomDto,
  UpdateRoomDto,
  ListRoomsQueryDto,
  ListPropertiesQueryDto,
  CreateRoomTypeDto,
  CreateServiceFeeDto,
} from './property.schema';

export const propertyService = {
  // ============================================================
  // PROPERTY (KHU TRỌ) OPERATIONS
  // ============================================================

  /**
   * Tạo khu trọ mới
   * @param ownerId - ID của chủ trọ
   * @param data - Thông tin khu trọ
   */
  async createProperty(ownerId: string, data: CreatePropertyDto) {
    return prisma.property.create({
      data: {
        ...data,
        ownerId,
      },
    });
  },

  /**
   * Lấy danh sách khu trọ của một chủ sở hữu
   * Bao gồm thống kê số phòng
   */
  async getPropertiesByOwner(ownerId: string, query: ListPropertiesQueryDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = calculateSkip(page, limit);

    const where = {
      ownerId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { address: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          // Đếm số phòng theo trạng thái
          _count: { select: { rooms: true } },
          rooms: {
            select: { status: true },
          },
        },
      }),
      prisma.property.count({ where }),
    ]);

    // Tính thống kê phòng cho mỗi khu trọ
    const propertiesWithStats = properties.map((p) => {
      const rooms = p.rooms;
      return {
        ...p,
        rooms: undefined, // Không trả về danh sách phòng
        stats: {
          total: rooms.length,
          available: rooms.filter((r) => r.status === 'AVAILABLE').length,
          occupied: rooms.filter((r) => r.status === 'OCCUPIED').length,
          maintenance: rooms.filter((r) => r.status === 'MAINTENANCE').length,
        },
      };
    });

    return { properties: propertiesWithStats, total };
  },

  /**
   * Lấy chi tiết một khu trọ
   */
  async getPropertyById(propertyId: string, userId: string) {
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        OR: [
          { ownerId: userId }, // Chủ sở hữu
          { staff: { some: { id: userId } } }, // Nhân viên quản lý
        ],
      },
      include: {
        owner: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        _count: { select: { rooms: true } },
        serviceFees: { where: { isActive: true } },
      },
    });

    if (!property) {
      throw new AppError('Không tìm thấy khu trọ hoặc bạn không có quyền truy cập', 404);
    }

    return property;
  },

  /**
   * Cập nhật thông tin khu trọ
   */
  async updateProperty(propertyId: string, ownerId: string, data: UpdatePropertyDto) {
    // Kiểm tra quyền sở hữu
    const property = await prisma.property.findFirst({
      where: { id: propertyId, ownerId },
    });
    if (!property) {
      throw new AppError('Không tìm thấy khu trọ hoặc không có quyền', 404);
    }

    return prisma.property.update({
      where: { id: propertyId },
      data,
    });
  },

  /**
   * Upload ảnh cho khu trọ
   */
  async addPropertyImages(propertyId: string, ownerId: string, imageUrls: string[]) {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, ownerId },
    });
    if (!property) throw new AppError('Không tìm thấy khu trọ', 404);

    return prisma.property.update({
      where: { id: propertyId },
      data: {
        images: { push: imageUrls },
      },
    });
  },

  // ============================================================
  // ROOM (PHÒNG) OPERATIONS
  // ============================================================

  /**
   * Tạo phòng mới trong khu trọ
   */
  async createRoom(propertyId: string, ownerId: string, data: CreateRoomDto) {
    // Xác nhận property thuộc về owner này
    const property = await prisma.property.findFirst({
      where: { id: propertyId, ownerId },
    });
    if (!property) {
      throw new AppError('Không tìm thấy khu trọ hoặc không có quyền', 404);
    }

    return prisma.room.create({
      data: {
        ...data,
        propertyId,
      },
      include: {
        roomType: true,
        property: { select: { name: true } },
      },
    });
  },

  /**
   * Lấy danh sách phòng trong một khu trọ
   * Hỗ trợ lọc theo trạng thái và tầng
   */
  async getRoomsByProperty(
    propertyId: string,
    userId: string,
    query: ListRoomsQueryDto
  ) {
    const { page = 1, limit = 20, status, search, floor } = query;
    const skip = calculateSkip(page, limit);

    // Kiểm tra quyền truy cập property
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        OR: [
          { ownerId: userId },
          { staff: { some: { id: userId } } },
        ],
      },
    });
    if (!property) {
      throw new AppError('Không tìm thấy khu trọ hoặc không có quyền', 403);
    }

    const where = {
      propertyId,
      ...(status && { status }),
      ...(floor !== undefined && { floor }),
      ...(search && {
        roomNumber: { contains: search, mode: 'insensitive' as const },
      }),
    };

    const [rooms, total] = await Promise.all([
      prisma.room.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
        include: {
          roomType: { select: { name: true } },
          // Lấy hợp đồng đang active để biết người thuê
          contracts: {
            where: { status: 'ACTIVE' },
            include: {
              tenant: {
                include: {
                  user: { select: { fullName: true, phone: true } },
                },
              },
            },
            take: 1,
          },
        },
      }),
      prisma.room.count({ where }),
    ]);

    return { rooms, total };
  },

  /**
   * Lấy chi tiết một phòng
   */
  async getRoomById(roomId: string, userId: string) {
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        property: {
          OR: [
            { ownerId: userId },
            { staff: { some: { id: userId } } },
          ],
        },
      },
      include: {
        property: { select: { id: true, name: true, address: true } },
        roomType: true,
        contracts: {
          where: { status: 'ACTIVE' },
          include: {
            tenant: {
              include: {
                user: { select: { id: true, fullName: true, phone: true, email: true, avatar: true } },
              },
            },
          },
        },
        utilityReadings: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 3, // 3 tháng gần nhất
        },
        maintenanceRequests: {
          where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!room) {
      throw new AppError('Không tìm thấy phòng', 404);
    }

    return room;
  },

  /**
   * Cập nhật thông tin phòng
   */
  async updateRoom(roomId: string, userId: string, data: UpdateRoomDto) {
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        property: { ownerId: userId },
      },
    });
    if (!room) throw new AppError('Không tìm thấy phòng hoặc không có quyền', 404);

    return prisma.room.update({
      where: { id: roomId },
      data,
    });
  },

  /**
   * Cập nhật trạng thái phòng (AVAILABLE, MAINTENANCE, INACTIVE)
   */
  async updateRoomStatus(
    roomId: string,
    userId: string,
    status: 'AVAILABLE' | 'MAINTENANCE' | 'INACTIVE'
  ) {
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        property: {
          OR: [{ ownerId: userId }, { staff: { some: { id: userId } } }],
        },
      },
    });
    if (!room) throw new AppError('Không tìm thấy phòng', 404);

    // Phòng đang có người thuê không thể đổi trạng thái tự do
    if (room.status === 'OCCUPIED' && status !== 'MAINTENANCE') {
      throw new AppError('Phòng đang có người thuê, chỉ có thể đặt trạng thái Bảo trì', 400);
    }

    return prisma.room.update({
      where: { id: roomId },
      data: { status },
    });
  },

  // ============================================================
  // ROOM TYPE OPERATIONS
  // ============================================================

  async createRoomType(data: CreateRoomTypeDto) {
    return prisma.roomType.create({ data });
  },

  async getRoomTypes() {
    return prisma.roomType.findMany({
      include: { _count: { select: { rooms: true } } },
    });
  },

  // ============================================================
  // SERVICE FEE OPERATIONS
  // ============================================================

  /**
   * Thêm phí dịch vụ cho khu trọ (điện, nước, rác, xe...)
   */
  async createServiceFee(
    propertyId: string,
    ownerId: string,
    data: CreateServiceFeeDto
  ) {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, ownerId },
    });
    if (!property) throw new AppError('Không tìm thấy khu trọ', 404);

    return prisma.serviceFee.create({
      data: { ...data, propertyId },
    });
  },

  async getServiceFees(propertyId: string) {
    return prisma.serviceFee.findMany({
      where: { propertyId, isActive: true },
    });
  },
};
