/**
 * modules/utilities/utility.service.ts
 * Business logic cho Utility Management
 * Quản lý chỉ số điện, nước hàng tháng; tính tiền điện nước
 */

import prisma from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import { CreateUtilityReadingDto, UpdateUtilityReadingDto } from './utility.schema';

export const utilityService = {
  /**
   * Nhập chỉ số điện nước cho một phòng trong tháng
   * Mỗi phòng chỉ có 1 bản ghi cho mỗi tháng/năm (unique constraint)
   */
  async createOrUpdateReading(
    userId: string,
    data: CreateUtilityReadingDto
  ) {
    // Kiểm tra quyền truy cập phòng
    const room = await prisma.room.findFirst({
      where: {
        id: data.roomId,
        property: {
          OR: [
            { ownerId: userId },
            { staff: { some: { id: userId } } },
          ],
        },
      },
    });

    if (!room) {
      throw new AppError('Không tìm thấy phòng hoặc không có quyền', 404);
    }

    // Tính tiêu thụ
    const electricUsage = data.electricCurr - data.electricPrev;
    const waterUsage = data.waterCurr - data.waterPrev;

    // Upsert: tạo mới nếu chưa có, cập nhật nếu đã có
    const reading = await prisma.utilityReading.upsert({
      where: {
        roomId_month_year: {
          roomId: data.roomId,
          month: data.month,
          year: data.year,
        },
      },
      create: {
        roomId: data.roomId,
        month: data.month,
        year: data.year,
        electricPrev: data.electricPrev,
        electricCurr: data.electricCurr,
        electricRate: data.electricRate,
        waterPrev: data.waterPrev,
        waterCurr: data.waterCurr,
        waterRate: data.waterRate,
        recordedBy: userId,
      },
      update: {
        electricPrev: data.electricPrev,
        electricCurr: data.electricCurr,
        electricRate: data.electricRate,
        waterPrev: data.waterPrev,
        waterCurr: data.waterCurr,
        waterRate: data.waterRate,
        recordedBy: userId,
        recordedAt: new Date(),
      },
    });

    // Trả về kết quả kèm tính toán
    return {
      ...reading,
      electricUsage,
      waterUsage,
      electricAmount: electricUsage * data.electricRate,
      waterAmount: waterUsage * data.waterRate,
      totalUtilityAmount:
        electricUsage * data.electricRate + waterUsage * data.waterRate,
    };
  },

  /**
   * Lấy danh sách chỉ số điện nước của một phòng
   */
  async getReadingsByRoom(roomId: string, userId: string) {
    // Kiểm tra quyền
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        property: {
          OR: [
            { ownerId: userId },
            { staff: { some: { id: userId } } },
          ],
        },
      },
    });

    if (!room) throw new AppError('Không tìm thấy phòng', 404);

    const readings = await prisma.utilityReading.findMany({
      where: { roomId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    // Tính toán cho từng bản ghi
    return readings.map((r) => {
      const electricUsage = r.electricCurr - r.electricPrev;
      const waterUsage = r.waterCurr - r.waterPrev;
      return {
        ...r,
        electricUsage,
        waterUsage,
        electricAmount: electricUsage * r.electricRate,
        waterAmount: waterUsage * r.waterRate,
      };
    });
  },

  /**
   * Lấy chỉ số tháng cụ thể
   */
  async getReadingByMonth(roomId: string, month: number, year: number, userId: string) {
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        property: {
          OR: [
            { ownerId: userId },
            { staff: { some: { id: userId } } },
            // Tenant của phòng này cũng có thể xem
            {
              rooms: {
                some: {
                  contracts: {
                    some: {
                      status: 'ACTIVE',
                      tenant: { userId },
                    },
                  },
                },
              },
            },
          ],
        },
      },
    });

    if (!room) throw new AppError('Không tìm thấy phòng', 404);

    const reading = await prisma.utilityReading.findUnique({
      where: {
        roomId_month_year: { roomId, month, year },
      },
    });

    if (!reading) return null;

    const electricUsage = reading.electricCurr - reading.electricPrev;
    const waterUsage = reading.waterCurr - reading.waterPrev;

    return {
      ...reading,
      electricUsage,
      waterUsage,
      electricAmount: electricUsage * reading.electricRate,
      waterAmount: waterUsage * reading.waterRate,
    };
  },

  /**
   * Lấy toàn bộ chỉ số của một khu trọ trong tháng
   * Dùng để sinh hóa đơn hàng loạt
   */
  async getPropertyReadingsByMonth(
    propertyId: string,
    month: number,
    year: number,
    userId: string
  ) {
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        OR: [{ ownerId: userId }, { staff: { some: { id: userId } } }],
      },
    });

    if (!property) throw new AppError('Không tìm thấy khu trọ', 404);

    const readings = await prisma.utilityReading.findMany({
      where: {
        month,
        year,
        room: { propertyId },
      },
      include: {
        room: { select: { roomNumber: true } },
      },
    });

    return readings.map((r) => {
      const electricUsage = r.electricCurr - r.electricPrev;
      const waterUsage = r.waterCurr - r.waterPrev;
      return {
        ...r,
        electricUsage,
        waterUsage,
        electricAmount: electricUsage * r.electricRate,
        waterAmount: waterUsage * r.waterRate,
      };
    });
  },
};
