/**
 * modules/users/user.schema.ts
 * Validation schemas cho User Management module
 */

import { z } from 'zod';

/**
 * Schema cập nhật hồ sơ cá nhân
 */
export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Họ tên phải có ít nhất 2 ký tự')
    .max(100, 'Họ tên tối đa 100 ký tự')
    .trim()
    .optional(),

  phone: z
    .string()
    .regex(/^(0|\+84)[0-9]{9}$/, 'Số điện thoại không hợp lệ')
    .optional()
    .nullable(),
});

/**
 * Schema tạo tài khoản (dành cho OWNER tạo STAFF)
 */
export const createUserSchema = z.object({
  email: z.string().email('Email không hợp lệ').toLowerCase(),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
  fullName: z.string().min(2).max(100).trim(),
  phone: z.string().regex(/^(0|\+84)[0-9]{9}$/).optional(),
  role: z.enum(['OWNER', 'STAFF', 'TENANT']),
});

/**
 * Schema cập nhật FCM token (cho push notification)
 */
export const updateFcmTokenSchema = z.object({
  fcmToken: z.string().min(1, 'FCM token là bắt buộc'),
});

/**
 * Schema filter danh sách users
 */
export const listUsersQuerySchema = z.object({
  page: z.string().optional().transform(v => v ? parseInt(v) : 1),
  limit: z.string().optional().transform(v => v ? parseInt(v) : 10),
  search: z.string().optional(),
  role: z.enum(['OWNER', 'STAFF', 'TENANT']).optional(),
  isActive: z.string().optional().transform(v => v === 'true' ? true : v === 'false' ? false : undefined),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateFcmTokenDto = z.infer<typeof updateFcmTokenSchema>;
export type ListUsersQueryDto = z.infer<typeof listUsersQuerySchema>;
