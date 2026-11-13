/**
 * modules/users/user.controller.ts
 * Controller cho User Management module
 */

import { Response } from 'express';
import { userService } from './user.service';
import { sendSuccess } from '../../utils/response';
import { buildPaginationMeta } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';
import {
  UpdateProfileDto,
  CreateUserDto,
  UpdateFcmTokenDto,
  ListUsersQueryDto,
} from './user.schema';

export const userController = {
  /**
   * GET /api/v1/users/profile
   * Lấy thông tin cá nhân của user đang đăng nhập
   */
  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = await userService.getUserById(req.user!.id);
    sendSuccess(res, user, 'Lấy thông tin thành công');
  },

  /**
   * GET /api/v1/users/:id
   * Lấy thông tin user theo ID (OWNER/STAFF)
   */
  async getUserById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = await userService.getUserById(req.params.id);
    sendSuccess(res, user, 'Lấy thông tin thành công');
  },

  /**
   * PUT /api/v1/users/profile
   * Cập nhật hồ sơ cá nhân
   */
  async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const data = req.body as UpdateProfileDto;
    const user = await userService.updateProfile(req.user!.id, data);
    sendSuccess(res, user, 'Cập nhật thông tin thành công');
  },

  /**
   * POST /api/v1/users/avatar
   * Upload avatar (multipart/form-data, field: avatar)
   */
  async uploadAvatar(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'Vui lòng chọn ảnh' });
      return;
    }
    const user = await userService.updateAvatar(req.user!.id, req.file.buffer);
    sendSuccess(res, user, 'Cập nhật ảnh đại diện thành công');
  },

  /**
   * GET /api/v1/users
   * Lấy danh sách users (OWNER)
   */
  async listUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    const query = req.query as unknown as ListUsersQueryDto;
    const { users, total } = await userService.listUsers(query);
    const meta = buildPaginationMeta(
      query.page || 1,
      query.limit || 10,
      total
    );
    sendSuccess(res, users, 'Lấy danh sách người dùng thành công', 200, meta);
  },

  /**
   * POST /api/v1/users
   * Tạo tài khoản mới (OWNER tạo STAFF)
   */
  async createUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    const data = req.body as CreateUserDto;
    const user = await userService.createUser(data);
    sendSuccess(res, user, 'Tạo tài khoản thành công', 201);
  },

  /**
   * PATCH /api/v1/users/:id/status
   * Kích hoạt/vô hiệu hóa tài khoản
   */
  async toggleStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { isActive } = req.body as { isActive: boolean };
    const user = await userService.toggleUserStatus(req.params.id, isActive);
    sendSuccess(res, user, `Tài khoản đã ${isActive ? 'kích hoạt' : 'vô hiệu hóa'}`);
  },

  /**
   * POST /api/v1/users/fcm-token
   * Đăng ký FCM token để nhận push notification
   */
  async addFcmToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    const data = req.body as UpdateFcmTokenDto;
    await userService.addFcmToken(req.user!.id, data);
    sendSuccess(res, null, 'Đăng ký push notification thành công');
  },
};
