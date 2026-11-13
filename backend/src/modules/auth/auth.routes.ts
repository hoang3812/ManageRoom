/**
 * modules/auth/auth.routes.ts
 * Định nghĩa các route cho Authentication module
 * 
 * Public routes: /register, /login, /forgot-password, /reset-password, /verify-email
 * Protected routes: /logout, /refresh-token, /change-password, /me
 */

import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  refreshTokenSchema,
} from './auth.schema';

const router = Router();

// ============================================================
// Public routes - không cần đăng nhập
// ============================================================

/**
 * @route   POST /api/v1/auth/register
 * @desc    Đăng ký tài khoản mới
 * @access  Public
 */
router.post('/register', validate(registerSchema), authController.register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Đăng nhập hệ thống
 * @access  Public
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Làm mới access token
 * @access  Public (chỉ cần refresh token)
 */
router.post(
  '/refresh-token',
  validate(refreshTokenSchema),
  authController.refreshToken
);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Gửi email link đặt lại mật khẩu
 * @access  Public
 */
router.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  authController.forgotPassword
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Đặt lại mật khẩu với token từ email
 * @access  Public
 */
router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  authController.resetPassword
);

/**
 * @route   GET /api/v1/auth/verify-email?token=xxx
 * @desc    Xác thực địa chỉ email
 * @access  Public
 */
router.get('/verify-email', authController.verifyEmail);

// ============================================================
// Protected routes - cần đăng nhập
// ============================================================

/**
 * @route   GET /api/v1/auth/me
 * @desc    Lấy thông tin user đang đăng nhập
 * @access  Private
 */
router.get('/me', authenticate, authController.getMe);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Đăng xuất thiết bị hiện tại
 * @access  Private
 */
router.post(
  '/logout',
  authenticate,
  validate(refreshTokenSchema),
  authController.logout
);

/**
 * @route   POST /api/v1/auth/logout-all
 * @desc    Đăng xuất tất cả thiết bị
 * @access  Private
 */
router.post('/logout-all', authenticate, authController.logoutAll);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Đổi mật khẩu (khi đã đăng nhập)
 * @access  Private
 */
router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword
);

export default router;
