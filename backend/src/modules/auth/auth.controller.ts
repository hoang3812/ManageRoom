/**
 * modules/auth/auth.controller.ts
 * Xử lý HTTP request/response cho Authentication
 * Controller chỉ nhận request, gọi service, trả response - không chứa business logic
 */

import { Request, Response } from 'express';
import { authService } from './auth.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  RefreshTokenDto,
} from './auth.schema';

export const authController = {
  /**
   * POST /api/v1/auth/register
   * Đăng ký tài khoản mới
   */
  async register(req: Request, res: Response): Promise<void> {
    const data = req.body as RegisterDto;
    const user = await authService.register(data);
    sendSuccess(res, user, 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản', 201);
  },

  /**
   * POST /api/v1/auth/login
   * Đăng nhập và nhận tokens
   */
  async login(req: Request, res: Response): Promise<void> {
    const data = req.body as LoginDto;
    const result = await authService.login(data);
    sendSuccess(res, result, 'Đăng nhập thành công');
  },

  /**
   * POST /api/v1/auth/refresh-token
   * Làm mới access token bằng refresh token
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body as RefreshTokenDto;
    const tokens = await authService.refreshToken(refreshToken);
    sendSuccess(res, tokens, 'Làm mới token thành công');
  },

  /**
   * POST /api/v1/auth/logout
   * Đăng xuất thiết bị hiện tại
   */
  async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { refreshToken } = req.body as RefreshTokenDto;
    if (!req.user) {
      sendError(res, 'Chưa xác thực', 401);
      return;
    }
    await authService.logout(req.user.id, refreshToken);
    sendSuccess(res, null, 'Đăng xuất thành công');
  },

  /**
   * POST /api/v1/auth/logout-all
   * Đăng xuất tất cả thiết bị
   */
  async logoutAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      sendError(res, 'Chưa xác thực', 401);
      return;
    }
    await authService.logoutAll(req.user.id);
    sendSuccess(res, null, 'Đã đăng xuất tất cả thiết bị');
  },

  /**
   * POST /api/v1/auth/forgot-password
   * Gửi email reset mật khẩu
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    const data = req.body as ForgotPasswordDto;
    await authService.forgotPassword(data);
    // Luôn trả về success để không lộ thông tin email có tồn tại không
    sendSuccess(res, null, 'Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu');
  },

  /**
   * POST /api/v1/auth/reset-password
   * Đặt lại mật khẩu với token từ email
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    const data = req.body as ResetPasswordDto;
    await authService.resetPassword(data);
    sendSuccess(res, null, 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại');
  },

  /**
   * POST /api/v1/auth/change-password
   * Đổi mật khẩu khi đã đăng nhập
   */
  async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      sendError(res, 'Chưa xác thực', 401);
      return;
    }
    const data = req.body as ChangePasswordDto;
    await authService.changePassword(req.user.id, data);
    sendSuccess(res, null, 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại');
  },

  /**
   * GET /api/v1/auth/verify-email?token=xxx
   * Xác thực email từ link trong email
   */
  async verifyEmail(req: Request, res: Response): Promise<void> {
    const { token } = req.query as { token: string };
    if (!token) {
      sendError(res, 'Token là bắt buộc', 400);
      return;
    }
    await authService.verifyEmail(token);
    sendSuccess(res, null, 'Email đã được xác thực thành công');
  },

  /**
   * GET /api/v1/auth/me
   * Lấy thông tin user hiện tại
   */
  async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    sendSuccess(res, req.user, 'Lấy thông tin thành công');
  },
};
