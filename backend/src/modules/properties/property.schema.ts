/**
 * modules/properties/property.schema.ts
 * Validation schemas cho Property (Khu trọ) và Room (Phòng) Management
 */

import { z } from 'zod';

// ============================================================
// Property (Khu trọ) schemas
// ============================================================

export const createPropertySchema = z.object({
  name: z.string().min(2, 'Tên khu trọ phải có ít nhất 2 ký tự').max(200).trim(),
  address: z.string().min(5, 'Địa chỉ không hợp lệ').trim(),
  ward: z.string().optional(),      // Phường/xã
  district: z.string().optional(),  // Quận/huyện
  province: z.string().min(1, 'Tỉnh/thành là bắt buộc'),
  description: z.string().optional(),
});

export const updatePropertySchema = createPropertySchema.partial();

// ============================================================
// Room Type (Loại phòng) schemas
// ============================================================

export const createRoomTypeSchema = z.object({
  name: z.string().min(1, 'Tên loại phòng là bắt buộc'),
  description: z.string().optional(),
});

// ============================================================
// Room (Phòng trọ) schemas
// ============================================================

export const createRoomSchema = z.object({
  roomNumber: z.string().min(1, 'Số phòng là bắt buộc').trim(),
  floor: z.number().int().optional(),          // Tầng
  area: z.number().positive('Diện tích phải > 0').optional(),  // m²
  maxOccupants: z.number().int().min(1).default(2), // Số người tối đa
  basePrice: z.number().positive('Giá thuê phải > 0'), // Giá thuê cơ bản
  deposit: z.number().min(0).default(0),        // Tiền đặt cọc
  description: z.string().optional(),
  roomTypeId: z.string().optional(),
});

export const updateRoomSchema = createRoomSchema.partial();

// ============================================================
// Query schemas
// ============================================================

export const listRoomsQuerySchema = z.object({
  page: z.string().optional().transform(v => v ? parseInt(v) : 1),
  limit: z.string().optional().transform(v => v ? parseInt(v) : 20),
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE']).optional(),
  search: z.string().optional(),
  floor: z.string().optional().transform(v => v ? parseInt(v) : undefined),
});

export const listPropertiesQuerySchema = z.object({
  page: z.string().optional().transform(v => v ? parseInt(v) : 1),
  limit: z.string().optional().transform(v => v ? parseInt(v) : 10),
  search: z.string().optional(),
});

// Service fee schema
export const createServiceFeeSchema = z.object({
  name: z.string().min(1, 'Tên dịch vụ là bắt buộc'),
  amount: z.number().positive('Số tiền phải > 0'),
  unit: z.string().optional(),  // Ví dụ: người/tháng, xe/tháng
});

export type CreatePropertyDto = z.infer<typeof createPropertySchema>;
export type UpdatePropertyDto = z.infer<typeof updatePropertySchema>;
export type CreateRoomTypeDto = z.infer<typeof createRoomTypeSchema>;
export type CreateRoomDto = z.infer<typeof createRoomSchema>;
export type UpdateRoomDto = z.infer<typeof updateRoomSchema>;
export type ListRoomsQueryDto = z.infer<typeof listRoomsQuerySchema>;
export type ListPropertiesQueryDto = z.infer<typeof listPropertiesQuerySchema>;
export type CreateServiceFeeDto = z.infer<typeof createServiceFeeSchema>;
