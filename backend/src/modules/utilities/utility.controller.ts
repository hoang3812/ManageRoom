/**
 * modules/utilities/utility.controller.ts
 */

import { Response } from 'express';
import { utilityService } from './utility.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';
import { CreateUtilityReadingDto } from './utility.schema';

export const utilityController = {
  async createOrUpdateReading(req: AuthenticatedRequest, res: Response): Promise<void> {
    const data = req.body as CreateUtilityReadingDto;
    const reading = await utilityService.createOrUpdateReading(req.user!.id, data);
    sendSuccess(res, reading, 'Nhập chỉ số điện nước thành công', 201);
  },

  async getReadingsByRoom(req: AuthenticatedRequest, res: Response): Promise<void> {
    const readings = await utilityService.getReadingsByRoom(req.params.roomId, req.user!.id);
    sendSuccess(res, readings, 'Lấy chỉ số điện nước thành công');
  },

  async getReadingByMonth(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { roomId } = req.params;
    const { month, year } = req.query as { month: string; year: string };
    const reading = await utilityService.getReadingByMonth(
      roomId,
      parseInt(month),
      parseInt(year),
      req.user!.id
    );
    sendSuccess(res, reading, reading ? 'Lấy chỉ số thành công' : 'Chưa có dữ liệu tháng này');
  },

  async getPropertyReadingsByMonth(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { propertyId } = req.params;
    const { month, year } = req.query as { month: string; year: string };
    const readings = await utilityService.getPropertyReadingsByMonth(
      propertyId,
      parseInt(month),
      parseInt(year),
      req.user!.id
    );
    sendSuccess(res, readings, 'Lấy chỉ số điện nước khu trọ thành công');
  },
};
