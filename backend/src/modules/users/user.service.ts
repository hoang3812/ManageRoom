/**
 * modules/users/user.service.ts
 * Business logic cho User Management module
 * Xử lý: hồ sơ người dùng, danh sách users, vô hiệu hóa tài khoản
 */

import prisma from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import { hashPassword } from '../../utils/password';
import { calculateSkip } from '../../utils/response';
import { uploadToCloudinary } from '../../middlewares/upload.middleware';
import {
  UpdateProfileDto,
  CreateUserDto,
  UpdateFcmTokenDto,
  ListUsersQueryDto,
} from './user.schema';

export const userService = {
  /**
   * Lấy thông tin chi tiết của một user theo ID
   * Bao gồm thông tin tenant nếu có
   */
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatar: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
        tenant: {
          // Thông tin chi tiết tenant (nếu là người thuê)
          select: {
            id: true,
            idCardNumber: true,
            birthDate: true,
            permanentAddress: true,
            occupation: true,
            emergencyContact: true,
            emergencyPhone: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('Không tìm thấy người dùng', 404);
    }

    return user;
  },

  /**
   * Cập nhật thông tin hồ sơ cá nhân
   */
  async updateProfile(userId: string, data: UpdateProfileDto) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.fullName && { fullName: data.fullName }),
        ...(data.phone !== undefined && { phone: data.phone }),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatar: true,
        role: true,
        updatedAt: true,
      },
    });
    return user;
  },

  /**
   * Upload và cập nhật avatar
   * @param userId - ID của user
   * @param buffer - Buffer ảnh từ multer
   */
  async updateAvatar(userId: string, buffer: Buffer) {
    // Upload lên Cloudinary
    const uploaded = await uploadToCloudinary(buffer, 'avatars');

    // Cập nhật URL avatar trong database
    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatar: uploaded.url },
      select: { id: true, avatar: true },
    });

    return user;
  },

  /**
   * Lấy danh sách users với phân trang và tìm kiếm
   * Chỉ dành cho OWNER/ADMIN
   */
  async listUsers(query: ListUsersQueryDto) {
    const { page = 1, limit = 10, search, role, isActive } = query;
    const skip = calculateSkip(page, limit);

    // Xây dựng điều kiện WHERE
    const where = {
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search } },
        ],
      }),
      ...(role && { role }),
      ...(isActive !== undefined && { isActive }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          avatar: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total };
  },

  /**
   * OWNER tạo tài khoản cho STAFF
   */
  async createUser(data: CreateUserDto) {
    // Kiểm tra email chưa tồn tại
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new AppError('Email đã tồn tại', 409);
    }

    const hashedPassword = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
        isEmailVerified: true, // Admin tạo thì bỏ qua verify
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
    });

    return user;
  },

  /**
   * Vô hiệu hóa/kích hoạt tài khoản
   */
  async toggleUserStatus(targetUserId: string, isActive: boolean) {
    const user = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        isActive,
        // Nếu vô hiệu hóa, xóa tất cả refresh tokens
        ...(isActive === false && { refreshTokens: { set: [] } }),
      },
      select: { id: true, email: true, isActive: true },
    });
    return user;
  },

  /**
   * Thêm FCM token để nhận push notification
   * Một user có thể có nhiều FCM tokens (nhiều thiết bị)
   */
  async addFcmToken(userId: string, data: UpdateFcmTokenDto) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Không tìm thấy người dùng', 404);

    // Chỉ thêm nếu chưa có token này
    if (!user.fcmTokens.includes(data.fcmToken)) {
      await prisma.user.update({
        where: { id: userId },
        data: { fcmTokens: { push: data.fcmToken } },
      });
    }
  },

  /**
   * Xóa FCM token (khi đăng xuất thiết bị)
   */
  async removeFcmToken(userId: string, fcmToken: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    await prisma.user.update({
      where: { id: userId },
      data: {
        fcmTokens: {
          set: user.fcmTokens.filter((t) => t !== fcmToken),
        },
      },
    });
  },
};
