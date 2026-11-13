import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { sendSuccess, sendError } from '../../utils/response';
import * as maintenanceService from './maintenance.service';

export const getAllRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const query = req.query as Record<string, string>;
  const page = parseInt(query.page || '1');
  const limit = parseInt(query.limit || '10');
  const result = await maintenanceService.getAllRequests(req.user!.id, req.user!.role, {
    page, limit,
    status: query.status as string | undefined,
    priority: query.priority as string | undefined,
    propertyId: query.propertyId as string | undefined,
  });
  sendSuccess(res, result.requests, 'Lấy danh sách yêu cầu bảo trì thành công', 200, result.meta);
};

export const getRequestById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const request = await maintenanceService.getRequestById(req.params.id);
  sendSuccess(res, request, 'Lấy thông tin yêu cầu bảo trì thành công');
};

export const createRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const files = (req.files as Express.Multer.File[]) || [];
  const request = await maintenanceService.createRequest(req.user!.id, req.body, files);
  sendSuccess(res, request, 'Tạo yêu cầu bảo trì thành công', 201);
};

export const updateRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const request = await maintenanceService.updateRequest(req.params.id, req.user!.id, req.user!.role, req.body);
  sendSuccess(res, request, 'Cập nhật yêu cầu bảo trì thành công');
};

export const assignRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { assigneeId } = req.body;
  if (!assigneeId) { sendError(res, 'Vui lòng chọn người được giao', 400); return; }
  const request = await maintenanceService.assignRequest(req.params.id, assigneeId);
  sendSuccess(res, request, 'Giao việc thành công');
};

export const rateRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { rating, feedback } = req.body;
  if (!rating || rating < 1 || rating > 5) { sendError(res, 'Đánh giá phải từ 1-5', 400); return; }
  const request = await maintenanceService.rateRequest(req.params.id, req.user!.id, rating, feedback);
  sendSuccess(res, request, 'Đánh giá thành công');
};
