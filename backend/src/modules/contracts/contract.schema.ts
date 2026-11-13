/**
 * modules/contracts/contract.schema.ts
 * Validation schemas cho Contract Management module
 */

import { z } from 'zod';

/**
 * Schema tạo hợp đồng mới
 * Hợp đồng liên kết phòng, người thuê, thời gian và giá thuê
 */
export const createContractSchema = z.object({
  roomId: z.string().min(1, 'ID phòng là bắt buộc'),
  tenantId: z.string().min(1, 'ID người thuê là bắt buộc'),

  startDate: z
    .string()
    .datetime('Ngày bắt đầu không hợp lệ')
    .transform((v) => new Date(v)),

  endDate: z
    .string()
    .datetime('Ngày kết thúc không hợp lệ')
    .transform((v) => new Date(v)),

  monthlyRent: z.number().positive('Giá thuê phải > 0'),
  deposit: z.number().min(0, 'Tiền đặt cọc không được âm'),
  depositPaid: z.boolean().default(false), // Đã nộp cọc chưa
  terms: z.string().optional(),            // Các điều khoản bổ sung
}).refine(
  (data) => data.endDate > data.startDate,
  {
    message: 'Ngày kết thúc phải sau ngày bắt đầu',
    path: ['endDate'],
  }
);

/**
 * Schema gia hạn hợp đồng
 */
export const renewContractSchema = z.object({
  newEndDate: z
    .string()
    .datetime('Ngày kết thúc không hợp lệ')
    .transform((v) => new Date(v)),
  newMonthlyRent: z.number().positive().optional(), // Có thể thay đổi giá
});

/**
 * Schema chấm dứt hợp đồng trước hạn
 */
export const terminateContractSchema = z.object({
  reason: z.string().min(10, 'Vui lòng nhập lý do chấm dứt hợp đồng (tối thiểu 10 ký tự)'),
  terminationDate: z
    .string()
    .datetime()
    .optional()
    .transform((v) => (v ? new Date(v) : new Date())),
});

export type CreateContractDto = z.infer<typeof createContractSchema>;
export type RenewContractDto = z.infer<typeof renewContractSchema>;
export type TerminateContractDto = z.infer<typeof terminateContractSchema>;
