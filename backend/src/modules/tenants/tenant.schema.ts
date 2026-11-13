/**
 * modules/tenants/tenant.schema.ts
 * Validation schemas cho Tenant Management module
 */

import { z } from 'zod';

/**
 * Schema cập nhật hồ sơ người thuê
 * Thông tin chi tiết phục vụ pháp lý và liên hệ khẩn cấp
 */
export const updateTenantProfileSchema = z.object({
  idCardNumber: z
    .string()
    .regex(/^[0-9]{9,12}$/, 'Số CCCD/CMND phải có 9-12 chữ số')
    .optional(),
  birthDate: z
    .string()
    .datetime()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  permanentAddress: z.string().max(500).optional(),
  occupation: z.string().max(200).optional(),  // Nghề nghiệp
  emergencyContact: z.string().max(200).optional(), // Tên người liên hệ khẩn cấp
  emergencyPhone: z
    .string()
    .regex(/^(0|\+84)[0-9]{9}$/, 'Số điện thoại không hợp lệ')
    .optional(),
});

export type UpdateTenantProfileDto = z.infer<typeof updateTenantProfileSchema>;
