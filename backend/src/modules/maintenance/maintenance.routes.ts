/**
 * modules/maintenance/maintenance.controller.ts + maintenance.routes.ts
 */

import { Response } from 'express';
import { maintenanceService, CreateMaintenanceDto, AssignMaintenanceDto, UpdateProgressDto, RateMaintenanceDto } from './maintenance.service';
import { sendSuccess } from '../../utils/response';
import { buildPaginationMeta } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';
import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { upload } from '../../middlewares/upload.middleware';

// ============================================================
// CONTROLLER
// ============================================================
export const maintenanceController = {
  async createRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    const data = req.body as CreateMaintenanceDto;
    const files = req.files as Express.Multer.File[];
    const request = await maintenanceService.createRequest(req.user!.id, data, files);
    sendSuccess(res, request, 'Gửi yêu cầu bảo trì thành công', 201);
  },

  async listRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { page = '1', limit = '10', status, priority, propertyId } = req.query as {
      page?: string; limit?: string; status?: string; priority?: string; propertyId?: string;
    };
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const { requests, total } = await maintenanceService.listRequests(req.user!.id, {
      page: pageNum,
      limit: limitNum,
      status,
      priority,
      propertyId,
    });

    const meta = buildPaginationMeta(pageNum, limitNum, total);
    sendSuccess(res, requests, 'Lấy danh sách yêu cầu bảo trì thành công', 200, meta);
  },

  async getRequestById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const request = await maintenanceService.getRequestById(req.params.id, req.user!.id);
    sendSuccess(res, request, 'Lấy chi tiết yêu cầu bảo trì thành công');
  },

  async assignMaintenance(req: AuthenticatedRequest, res: Response): Promise<void> {
    const data = req.body as AssignMaintenanceDto;
    const request = await maintenanceService.assignMaintenance(req.params.id, req.user!.id, data);
    sendSuccess(res, request, 'Phân công bảo trì thành công');
  },

  async updateProgress(req: AuthenticatedRequest, res: Response): Promise<void> {
    const data = req.body as UpdateProgressDto;
    const request = await maintenanceService.updateProgress(req.params.id, req.user!.id, data);
    sendSuccess(res, request, 'Cập nhật tiến độ thành công');
  },

  async rateMaintenance(req: AuthenticatedRequest, res: Response): Promise<void> {
    const data = req.body as RateMaintenanceDto;
    const request = await maintenanceService.rateMaintenance(req.params.id, req.user!.id, data);
    sendSuccess(res, request, 'Đánh giá thành công');
  },
};

// ============================================================
// ROUTES
// ============================================================
const router = Router();
router.use(authenticate);

/** GET /api/v1/maintenance - Danh sách yêu cầu */
router.get('/', maintenanceController.listRequests);

/** POST /api/v1/maintenance - Tạo yêu cầu báo hỏng */
router.post(
  '/',
  upload.array('images', 5),
  maintenanceController.createRequest
);

/** GET /api/v1/maintenance/:id - Chi tiết yêu cầu */
router.get('/:id', maintenanceController.getRequestById);

/** POST /api/v1/maintenance/:id/assign - Phân công */
router.post(
  '/:id/assign',
  authorize('OWNER'),
  maintenanceController.assignMaintenance
);

/** PATCH /api/v1/maintenance/:id/progress - Cập nhật tiến độ */
router.patch(
  '/:id/progress',
  authorize('OWNER', 'STAFF'),
  maintenanceController.updateProgress
);

/** POST /api/v1/maintenance/:id/rate - Tenant đánh giá */
router.post(
  '/:id/rate',
  authorize('TENANT'),
  maintenanceController.rateMaintenance
);

export default router;
