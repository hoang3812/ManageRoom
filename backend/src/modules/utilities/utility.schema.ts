/**
 * modules/utilities/utility.schema.ts
 * Validation schemas cho Utility Management (chỉ số điện nước)
 */

import { z } from 'zod';

/**
 * Schema nhập chỉ số điện nước hàng tháng
 */
export const createUtilityReadingSchema = z.object({
  roomId: z.string().min(1, 'ID phòng là bắt buộc'),
  month: z.number().int().min(1).max(12, 'Tháng phải từ 1-12'),
  year: z.number().int().min(2020).max(2100),

  // Chỉ số điện (kWh)
  electricPrev: z.number().min(0, 'Chỉ số điện cũ phải >= 0'),
  electricCurr: z.number().min(0, 'Chỉ số điện mới phải >= 0'),
  electricRate: z.number().positive('Đơn giá điện phải > 0').default(3500),

  // Chỉ số nước (m³)
  waterPrev: z.number().min(0, 'Chỉ số nước cũ phải >= 0'),
  waterCurr: z.number().min(0, 'Chỉ số nước mới phải >= 0'),
  waterRate: z.number().positive('Đơn giá nước phải > 0').default(15000),
}).refine(
  (data) => data.electricCurr >= data.electricPrev,
  {
    message: 'Chỉ số điện mới phải >= chỉ số cũ',
    path: ['electricCurr'],
  }
).refine(
  (data) => data.waterCurr >= data.waterPrev,
  {
    message: 'Chỉ số nước mới phải >= chỉ số cũ',
    path: ['waterCurr'],
  }
);

export const updateUtilityReadingSchema = createUtilityReadingSchema.partial().omit({
  roomId: true,
  month: true,
  year: true,
});

export type CreateUtilityReadingDto = z.infer<typeof createUtilityReadingSchema>;
export type UpdateUtilityReadingDto = z.infer<typeof updateUtilityReadingSchema>;
