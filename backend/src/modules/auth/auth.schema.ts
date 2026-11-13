/**
 * modules/auth/auth.schema.ts
 * Zod validation schemas cho các API của module Authentication
 * Mỗi schema kiểm tra dữ liệu đầu vào của từng endpoint
 */

import { z } from 'zod';

/**
 * Schema đăng ký tài khoản mới
 * - email: phải là email hợp lệ
 * - password: ít nhất 8 ký tự, có chữ hoa, chữ thường và số
 * - fullName: 2-100 ký tự
 * - phone: số điện thoại Việt Nam (tùy chọn)
 */
export const registerSchema = z.object({
  email: z
    .string({ required_error: 'Email là bắt buộc' })
    .email('Email không hợp lệ')
    .toLowerCase(), // Chuyển về lowercase trước khi lưu

  password: z
    .string({ required_error: 'Mật khẩu là bắt buộc' })
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Mật khẩu phải có ít nhất 1 chữ hoa, 1 chữ thường và 1 số'
    ),

  fullName: z
    .string({ required_error: 'Họ tên là bắt buộc' })
    .min(2, 'Họ tên phải có ít nhất 2 ký tự')
    .max(100, 'Họ tên tối đa 100 ký tự')
    .trim(),

  phone: z
    .string()
    .regex(/^(0|\+84)[0-9]{9}$/, 'Số điện thoại không hợp lệ')
    .optional(),

  role: z.enum(['OWNER', 'STAFF', 'TENANT']).default('TENANT'),
});

/**
 * Schema đăng nhập
 */
export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ').toLowerCase(),
  password: z.string().min(1, 'Mật khẩu là bắt buộc'),
});

/**
 * Schema quên mật khẩu - chỉ cần email
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email('Email không hợp lệ').toLowerCase(),
});

/**
 * Schema đặt lại mật khẩu (sau khi nhận link qua email)
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token là bắt buộc'),
  password: z
    .string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Mật khẩu phải có ít nhất 1 chữ hoa, 1 chữ thường và 1 số'
    ),
});

/**
 * Schema đổi mật khẩu (khi đã đăng nhập)
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mật khẩu hiện tại là bắt buộc'),
    newPassword: z
      .string()
      .min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Mật khẩu phải có ít nhất 1 chữ hoa, 1 chữ thường và 1 số'
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Xác nhận mật khẩu không khớp',
    path: ['confirmPassword'],
  });

/**
 * Schema refresh token
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token là bắt buộc'),
});

// TypeScript types tự động từ Zod schemas
export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
