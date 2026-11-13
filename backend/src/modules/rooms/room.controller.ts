import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { sendSuccess, sendError } from '../../utils/response';
import * as roomService from './room.service';
import { createRoomSchema, updateRoomSchema, roomQuerySchema } from './room.schema';
import { RoomStatus } from '@prisma/client';

export const getAllRooms = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const query = roomQuerySchema.parse(req.query);
  const result = await roomService.getAllRooms(query);
  sendSuccess(res, result.rooms, 'Lấy danh sách phòng thành công', 200, result.meta);
};

export const getRoomById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const room = await roomService.getRoomById(req.params.id);
  sendSuccess(res, room, 'Lấy thông tin phòng thành công');
};

export const createRoom = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const data = createRoomSchema.parse(req.body);
  const room = await roomService.createRoom(data);
  sendSuccess(res, room, 'Tạo phòng thành công', 201);
};

export const updateRoom = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const data = updateRoomSchema.parse(req.body);
  const room = await roomService.updateRoom(req.params.id, data);
  sendSuccess(res, room, 'Cập nhật phòng thành công');
};

export const deleteRoom = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await roomService.deleteRoom(req.params.id);
  sendSuccess(res, null, 'Xóa phòng thành công');
};

export const uploadRoomImages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    sendError(res, 'Vui lòng chọn ít nhất một ảnh', 400);
    return;
  }
  const room = await roomService.uploadRoomImages(req.params.id, files);
  sendSuccess(res, room, 'Upload ảnh phòng thành công');
};

export const getRoomTypes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const types = await roomService.getRoomTypes();
  sendSuccess(res, types, 'Lấy danh sách loại phòng thành công');
};

export const createRoomType = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, description } = req.body;
  if (!name) { sendError(res, 'Tên loại phòng không được để trống', 400); return; }
  const type = await roomService.createRoomType(name, description);
  sendSuccess(res, type, 'Tạo loại phòng thành công', 201);
};

export const updateRoomStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { status } = req.body;
  if (!Object.values(RoomStatus).includes(status)) {
    sendError(res, 'Trạng thái không hợp lệ', 400); return;
  }
  const room = await roomService.updateRoomStatus(req.params.id, status);
  sendSuccess(res, room, 'Cập nhật trạng thái phòng thành công');
};
