import { z } from 'zod';
import { RoomStatus } from '@prisma/client';

export const createRoomSchema = z.object({
  roomNumber: z.string().min(1, 'Số phòng không được để trống'),
  floor: z.number().int().optional(),
  area: z.number().positive().optional(),
  maxOccupants: z.number().int().positive().default(2),
  basePrice: z.number().positive('Giá phòng phải lớn hơn 0'),
  deposit: z.number().min(0).default(0),
  description: z.string().optional(),
  propertyId: z.string().min(1, 'Khu trọ không được để trống'),
  roomTypeId: z.string().optional(),
  status: z.nativeEnum(RoomStatus).optional().default(RoomStatus.AVAILABLE),
});

export const updateRoomSchema = createRoomSchema.partial().omit({ propertyId: true });

export const roomQuerySchema = z.object({
  page: z.string().optional().transform(v => v ? parseInt(v) : 1),
  limit: z.string().optional().transform(v => v ? parseInt(v) : 10),
  search: z.string().optional(),
  propertyId: z.string().optional(),
  status: z.nativeEnum(RoomStatus).optional(),
  roomTypeId: z.string().optional(),
});

export type CreateRoomDto = z.infer<typeof createRoomSchema>;
export type UpdateRoomDto = z.infer<typeof updateRoomSchema>;
export type RoomQueryDto = z.infer<typeof roomQuerySchema>;
