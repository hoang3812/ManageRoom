/**
 * modules/auth/auth.service.ts
 * Business logic cho Authentication module
 * Xử lý đăng ký, đăng nhập, token, mật khẩu
 */

import prisma from '../../config/database';
import { hashPassword, comparePassword, generateRandomToken } from '../../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { AppError } from '../../middlewares/error.middleware';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './auth.schema';
import { emailService } from '../../services/email.service';
import logger from '../../utils/logger';

// Số phút reset password token có hiệu lực
const RESET_PASSWORD_EXPIRES_MINUTES = 60;

export const authService = {
  /**
   * Đăng ký tài khoản mới
   * 1. Kiểm tra email chưa tồn tại
   * 2. Hash mật khẩu
   * 3. Tạo user trong database
   * 4. Gửi email xác thực
   */
  async register(data: RegisterDto) {
    // Kiểm tra email đã tồn tại chưa
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) {
      throw new AppError('Email đã được sử dụng', 409);
    }

    // Mã hóa mật khẩu
    const hashedPassword = await hashPassword(data.password);

    // Tạo token xác thực email
    const emailVerifyToken = generateRandomToken();

    // Tạo user trong database
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        fullName: data.fullName,
        phone: data.phone,
        role: data.role,
        emailVerifyToken,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
    });

    // Gửi email xác thực (không chờ, không block response)
    emailService.sendVerificationEmail(user.email, user.fullName, emailVerifyToken)
      .catch((err) => logger.error('Gửi email xác thực thất bại:', err));

    logger.info(`User mới đã đăng ký: ${user.email} (${user.role})`);
    return user;
  },

  /**
   * Đăng nhập
   * 1. Tìm user theo email
   * 2. Kiểm tra mật khẩu
   * 3. Tạo access token và refresh token
   * 4. Lưu refresh token vào database
   */
  async login(data: LoginDto) {
    // Tìm user, bao gồm password để so sánh
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    // Thông báo lỗi chung để tránh leak thông tin (không báo "email không tồn tại")
    if (!user || !user.isActive) {
      throw new AppError('Email hoặc mật khẩu không đúng', 401);
    }

    // Kiểm tra mật khẩu
    const isPasswordValid = await comparePassword(data.password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Email hoặc mật khẩu không đúng', 401);
    }

    // Tạo tokens
    const tokenPayload = { id: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Lưu refresh token (thêm vào mảng, hỗ trợ đa thiết bị)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokens: {
          push: refreshToken,
        },
      },
    });

    logger.info(`User đăng nhập: ${user.email}`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
      },
    };
  },

  /**
   * Làm mới access token bằng refresh token
   * Áp dụng Refresh Token Rotation: mỗi lần dùng sẽ cấp token mới và xóa token cũ
   */
  async refreshToken(refreshToken: string) {
    // Xác thực refresh token
    const payload = verifyRefreshToken(refreshToken);

    if (payload.type !== 'refresh') {
      throw new AppError('Token không hợp lệ', 401);
    }

    // Kiểm tra token có trong database không (phòng trường hợp bị thu hồi)
    const user = await prisma.user.findFirst({
      where: {
        id: payload.sub,
        refreshTokens: { has: refreshToken },
        isActive: true,
      },
    });

    if (!user) {
      throw new AppError('Refresh token không hợp lệ hoặc đã hết hạn', 401);
    }

    // Tạo token mới
    const tokenPayload = { id: user.id, email: user.email, role: user.role };
    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    // Xóa token cũ, thêm token mới (Token Rotation)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokens: {
          set: [
            ...user.refreshTokens.filter((t) => t !== refreshToken),
            newRefreshToken,
          ],
        },
      },
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  },

  /**
   * Đăng xuất - xóa refresh token khỏi database
   */
  async logout(userId: string, refreshToken: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    // Xóa refresh token cụ thể (đăng xuất thiết bị này)
    await prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokens: {
          set: user.refreshTokens.filter((t) => t !== refreshToken),
        },
      },
    });

    logger.info(`User đăng xuất: ${user.email}`);
  },

  /**
   * Đăng xuất tất cả thiết bị - xóa tất cả refresh tokens
   */
  async logoutAll(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshTokens: { set: [] } },
    });
  },

  /**
   * Quên mật khẩu - gửi link reset qua email
   */
  async forgotPassword(data: ForgotPasswordDto) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    // Không báo lỗi nếu email không tồn tại (bảo mật)
    if (!user) return;

    // Tạo reset token và thời gian hết hạn
    const resetToken = generateRandomToken();
    const resetExpires = new Date(
      Date.now() + RESET_PASSWORD_EXPIRES_MINUTES * 60 * 1000
    );

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires,
      },
    });

    // Gửi email chứa link reset password
    await emailService.sendResetPasswordEmail(
      user.email,
      user.fullName,
      resetToken
    );

    logger.info(`Reset password email sent to: ${user.email}`);
  },

  /**
   * Đặt lại mật khẩu sau khi nhấn link email
   */
  async resetPassword(data: ResetPasswordDto) {
    // Tìm user có reset token hợp lệ và chưa hết hạn
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: data.token,
        resetPasswordExpires: { gt: new Date() }, // Token chưa hết hạn
      },
    });

    if (!user) {
      throw new AppError('Token không hợp lệ hoặc đã hết hạn', 400);
    }

    // Cập nhật mật khẩu và xóa reset token
    const hashedPassword = await hashPassword(data.password);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        refreshTokens: [], // Đăng xuất tất cả thiết bị
      },
    });

    logger.info(`Mật khẩu đã được reset: ${user.email}`);
  },

  /**
   * Đổi mật khẩu (khi đã đăng nhập)
   */
  async changePassword(userId: string, data: ChangePasswordDto) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Không tìm thấy tài khoản', 404);

    // Xác thực mật khẩu hiện tại
    const isCurrentPasswordValid = await comparePassword(
      data.currentPassword,
      user.password
    );
    if (!isCurrentPasswordValid) {
      throw new AppError('Mật khẩu hiện tại không đúng', 400);
    }

    // Cập nhật mật khẩu mới
    const hashedPassword = await hashPassword(data.newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        refreshTokens: [], // Đăng xuất tất cả thiết bị sau khi đổi mật khẩu
      },
    });

    logger.info(`Đổi mật khẩu thành công: ${user.email}`);
  },

  /**
   * Xác thực email từ link trong email
   */
  async verifyEmail(token: string) {
    const user = await prisma.user.findFirst({
      where: { emailVerifyToken: token },
    });

    if (!user) {
      throw new AppError('Token xác thực không hợp lệ', 400);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerifyToken: null,
      },
    });

    logger.info(`Email đã xác thực: ${user.email}`);
  },
};
