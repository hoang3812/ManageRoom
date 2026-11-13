/**
 * modules/maintenance/maintenance.service.ts
 * Business logic cho Maintenance Management
 * Báo hỏng, phân công sửa chữa, theo dõi tiến độ, đánh giá
 */

import prisma from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import { calculateSkip } from '../../utils/response';
import { generateMaintenanceCode, getNextSequence } from '../../utils/code-generator';
import { uploadMultipleImages } from '../../middlewares/upload.middleware';

export interface CreateMaintenanceDto {
  roomId: string;
  title: string;
  description: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

export interface AssignMaintenanceDto {
  assigneeId: string;
  scheduledAt?: Date;
}

export interface UpdateProgressDto {
  status: 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  notes?: string;
  cost?: number;
  completedAt?: Date;
}

export interface RateMaintenanceDto {
  rating: number; // 1-5
  feedback?: string;
}

export const maintenanceService = {
  /**
   * Tenant hoặc Staff báo hỏng
   */
  async createRequest(
    userId: string,
    data: CreateMaintenanceDto,
    imageFiles?: Express.Multer.File[]
  ) {
    // Kiểm tra phòng tồn tại và user có liên quan
    const room = await prisma.room.findFirst({
      where: {
        id: data.roomId,
        OR: [
          // TENANT: phải có hợp đồng active với phòng này
          {
            contracts: {
              some: {
                status: 'ACTIVE',
                tenant: { userId },
              },
            },
          },
          // OWNER/STAFF: quản lý property có phòng này
          { property: { OR: [{ ownerId: userId }, { staff: { some: { id: userId } } }] } },
        ],
      },
    });

    if (!room) {
      throw new AppError('Không tìm thấy phòng hoặc bạn không có quyền báo hỏng phòng này', 403);
    }

    // Upload ảnh mô tả hư hỏng
    let imageUrls: string[] = [];
    if (imageFiles && imageFiles.length > 0) {
      imageUrls = await uploadMultipleImages(imageFiles, 'maintenance');
    }

    // Tạo mã báo hỏng
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const count = await prisma.maintenanceRequest.count({
      where: { createdAt: { gte: today } },
    });
    const requestCode = generateMaintenanceCode(getNextSequence(count));

    return prisma.maintenanceRequest.create({
      data: {
        requestCode,
        roomId: data.roomId,
        requesterId: userId,
        title: data.title,
        description: data.description,
        priority: data.priority || 'MEDIUM',
        images: imageUrls,
        status: 'PENDING',
      },
      include: {
        room: {
          select: {
            roomNumber: true,
            property: { select: { name: true } },
          },
        },
        requester: { select: { fullName: true, phone: true } },
      },
    });
  },

  /**
   * Phân công nhân viên sửa chữa
   */
  async assignMaintenance(
    requestId: string,
    userId: string,
    data: AssignMaintenanceDto
  ) {
    // Chỉ OWNER mới có thể phân công
    const request = await prisma.maintenanceRequest.findFirst({
      where: {
        id: requestId,
        status: 'PENDING',
        room: { property: { ownerId: userId } },
      },
    });

    if (!request) {
      throw new AppError('Không tìm thấy yêu cầu hoặc không có quyền', 404);
    }

    // Kiểm tra nhân viên được phân công có quản lý property này không
    const assignee = await prisma.user.findFirst({
      where: {
        id: data.assigneeId,
        OR: [
          { role: 'STAFF' },
          { role: 'OWNER' },
        ],
      },
    });

    if (!assignee) {
      throw new AppError('Không tìm thấy nhân viên', 404);
    }

    return prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: {
        assigneeId: data.assigneeId,
        scheduledAt: data.scheduledAt,
        status: 'IN_PROGRESS',
      },
      include: {
        assignee: { select: { fullName: true, phone: true } },
      },
    });
  },

  /**
   * Cập nhật tiến độ sửa chữa
   */
  async updateProgress(
    requestId: string,
    userId: string,
    data: UpdateProgressDto
  ) {
    // Nhân viên được phân công hoặc OWNER có thể cập nhật
    const request = await prisma.maintenanceRequest.findFirst({
      where: {
        id: requestId,
        OR: [
          { assigneeId: userId },
          { room: { property: { ownerId: userId } } },
        ],
      },
    });

    if (!request) throw new AppError('Không tìm thấy yêu cầu hoặc không có quyền', 404);

    return prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: {
        status: data.status,
        notes: data.notes,
        cost: data.cost,
        completedAt: data.status === 'COMPLETED' ? (data.completedAt || new Date()) : null,
      },
    });
  },

  /**
   * Tenant đánh giá sau khi sửa chữa xong
   */
  async rateMaintenance(requestId: string, userId: string, data: RateMaintenanceDto) {
    if (data.rating < 1 || data.rating > 5) {
      throw new AppError('Đánh giá phải từ 1-5 sao', 400);
    }

    // Chỉ tenant của phòng mới được đánh giá
    const request = await prisma.maintenanceRequest.findFirst({
      where: {
        id: requestId,
        status: 'COMPLETED',
        requester: { id: userId }, // Phải là người đã báo hỏng
        rating: null, // Chưa đánh giá
      },
    });

    if (!request) {
      throw new AppError('Không thể đánh giá yêu cầu này', 400);
    }

    return prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: { rating: data.rating, feedback: data.feedback },
    });
  },

  /**
   * Lấy danh sách yêu cầu bảo trì
   */
  async listRequests(
    userId: string,
    query: {
      page: number;
      limit: number;
      status?: string;
      priority?: string;
      propertyId?: string;
    }
  ) {
    const { page = 1, limit = 10, status, priority, propertyId } = query;
    const skip = calculateSkip(page, limit);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    // Filter theo role
    const where =
      user?.role === 'TENANT'
        ? // Tenant chỉ thấy yêu cầu của mình
          {
            requesterId: userId,
            ...(status && { status: status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' }),
          }
        : // Owner/Staff thấy tất cả trong property
          {
            room: {
              property: {
                OR: [
                  { ownerId: userId },
                  { staff: { some: { id: userId } } },
                ],
                ...(propertyId && { id: propertyId }),
              },
            },
            ...(status && { status: status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' }),
            ...(priority && { priority: priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' }),
          };

    const [requests, total] = await Promise.all([
      prisma.maintenanceRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { priority: 'desc' }, // URGENT trước
          { createdAt: 'desc' },
        ],
        include: {
          room: {
            select: {
              roomNumber: true,
              property: { select: { name: true } },
            },
          },
          requester: { select: { fullName: true, phone: true, avatar: true } },
          assignee: { select: { fullName: true, phone: true } },
        },
      }),
      prisma.maintenanceRequest.count({ where }),
    ]);

    return { requests, total };
  },

  async getRequestById(requestId: string, userId: string) {
    const request = await prisma.maintenanceRequest.findFirst({
      where: {
        id: requestId,
        OR: [
          { requesterId: userId },
          { assigneeId: userId },
          { room: { property: { OR: [{ ownerId: userId }, { staff: { some: { id: userId } } }] } } },
        ],
      },
      include: {
        room: {
          include: {
            property: { select: { name: true, address: true } },
          },
        },
        requester: { select: { fullName: true, phone: true, avatar: true } },
        assignee: { select: { fullName: true, phone: true } },
      },
    });

    if (!request) throw new AppError('Không tìm thấy yêu cầu bảo trì', 404);
    return request;
  },
};
