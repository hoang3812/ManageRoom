/**
 * modules/properties/property.controller.ts
 * Controller cho Property và Room Management
 */

import { Response } from 'express';
import { propertyService } from './property.service';
import { sendSuccess } from '../../utils/response';
import { buildPaginationMeta } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';
import { uploadMultipleImages } from '../../middlewares/upload.middleware';
import {
  CreatePropertyDto,
  UpdatePropertyDto,
  CreateRoomDto,
  UpdateRoomDto,
  ListRoomsQueryDto,
  ListPropertiesQueryDto,
  CreateServiceFeeDto,
  CreateRoomTypeDto,
} from './property.schema';

export const propertyController = {
  // ========== PROPERTY ==========

  async createProperty(req: AuthenticatedRequest, res: Response): Promise<void> {
    const data = req.body as CreatePropertyDto;
    const property = await propertyService.createProperty(req.user!.id, data);
    sendSuccess(res, property, 'Tạo khu trọ thành công', 201);
  },

  async getMyProperties(req: AuthenticatedRequest, res: Response): Promise<void> {
    const query = req.query as unknown as ListPropertiesQueryDto;
    const { properties, total } = await propertyService.getPropertiesByOwner(
      req.user!.id,
      query
    );
    const meta = buildPaginationMeta(query.page || 1, query.limit || 10, total);
    sendSuccess(res, properties, 'Lấy danh sách khu trọ thành công', 200, meta);
  },

  async getPropertyById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const property = await propertyService.getPropertyById(
      req.params.id,
      req.user!.id
    );
    sendSuccess(res, property, 'Lấy thông tin khu trọ thành công');
  },

  async updateProperty(req: AuthenticatedRequest, res: Response): Promise<void> {
    const data = req.body as UpdatePropertyDto;
    const property = await propertyService.updateProperty(
      req.params.id,
      req.user!.id,
      data
    );
    sendSuccess(res, property, 'Cập nhật khu trọ thành công');
  },

  async uploadPropertyImages(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      res.status(400).json({ success: false, message: 'Vui lòng chọn ảnh' });
      return;
    }
    const imageUrls = await uploadMultipleImages(req.files, 'properties');
    const property = await propertyService.addPropertyImages(
      req.params.id,
      req.user!.id,
      imageUrls
    );
    sendSuccess(res, property, 'Upload ảnh thành công');
  },

  // ========== ROOM ==========

  async createRoom(req: AuthenticatedRequest, res: Response): Promise<void> {
    const data = req.body as CreateRoomDto;
    const room = await propertyService.createRoom(
      req.params.propertyId,
      req.user!.id,
      data
    );
    sendSuccess(res, room, 'Tạo phòng thành công', 201);
  },

  async getRoomsByProperty(req: AuthenticatedRequest, res: Response): Promise<void> {
    const query = req.query as unknown as ListRoomsQueryDto;
    const { rooms, total } = await propertyService.getRoomsByProperty(
      req.params.propertyId,
      req.user!.id,
      query
    );
    const meta = buildPaginationMeta(query.page || 1, query.limit || 20, total);
    sendSuccess(res, rooms, 'Lấy danh sách phòng thành công', 200, meta);
  },

  async getRoomById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const room = await propertyService.getRoomById(req.params.id, req.user!.id);
    sendSuccess(res, room, 'Lấy thông tin phòng thành công');
  },

  async updateRoom(req: AuthenticatedRequest, res: Response): Promise<void> {
    const data = req.body as UpdateRoomDto;
    const room = await propertyService.updateRoom(
      req.params.id,
      req.user!.id,
      data
    );
    sendSuccess(res, room, 'Cập nhật phòng thành công');
  },

  async updateRoomStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { status } = req.body as { status: 'AVAILABLE' | 'MAINTENANCE' | 'INACTIVE' };
    const room = await propertyService.updateRoomStatus(
      req.params.id,
      req.user!.id,
      status
    );
    sendSuccess(res, room, 'Cập nhật trạng thái phòng thành công');
  },

  // ========== ROOM TYPE ==========

  async createRoomType(req: AuthenticatedRequest, res: Response): Promise<void> {
    const data = req.body as CreateRoomTypeDto;
    const roomType = await propertyService.createRoomType(data);
    sendSuccess(res, roomType, 'Tạo loại phòng thành công', 201);
  },

  async getRoomTypes(req: AuthenticatedRequest, res: Response): Promise<void> {
    const roomTypes = await propertyService.getRoomTypes();
    sendSuccess(res, roomTypes, 'Lấy danh sách loại phòng thành công');
  },

  // ========== SERVICE FEE ==========

  async createServiceFee(req: AuthenticatedRequest, res: Response): Promise<void> {
    const data = req.body as CreateServiceFeeDto;
    const fee = await propertyService.createServiceFee(
      req.params.propertyId,
      req.user!.id,
      data
    );
    sendSuccess(res, fee, 'Tạo phí dịch vụ thành công', 201);
  },

  async getServiceFees(req: AuthenticatedRequest, res: Response): Promise<void> {
    const fees = await propertyService.getServiceFees(req.params.propertyId);
    sendSuccess(res, fees, 'Lấy danh sách phí dịch vụ thành công');
  },
};
