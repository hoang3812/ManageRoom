/**
 * modules/tenants/tenant.controller.ts + tenant.routes.ts
 * Controller và Routes cho Tenant Management module
 */

import { Response } from 'express';
import { tenantService } from './tenant.service';
import { sendSuccess } from '../../utils/response';
import { buildPaginationMeta } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';
import { UpdateTenantProfileDto } from './tenant.schema';

export const tenantController = {
  /**
   * GET /api/v1/tenants/profile
   * Tenant xem/tạo hồ sơ của mình
   */
  async getMyProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const profile = await tenantService.getOrCreateTenantProfile(req.user!.id);
    sendSuccess(res, profile, 'Lấy hồ sơ thành công');
  },

  /**
   * PUT /api/v1/tenants/profile
   * Tenant cập nhật hồ sơ (CCCD, ngày sinh...)
   */
  async updateMyProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const data = req.body as UpdateTenantProfileDto;
    const profile = await tenantService.updateTenantProfile(req.user!.id, data);
    sendSuccess(res, profile, 'Cập nhật hồ sơ thành công');
  },

  /**
   * POST /api/v1/tenants/id-card
   * Upload ảnh CCCD (multipart: idCardFront, idCardBack)
   */
  async uploadIdCard(req: AuthenticatedRequest, res: Response): Promise<void> {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const frontBuffer = files?.['idCardFront']?.[0]?.buffer;
    const backBuffer = files?.['idCardBack']?.[0]?.buffer;

    if (!frontBuffer && !backBuffer) {
      res.status(400).json({ success: false, message: 'Vui lòng chọn ít nhất một ảnh CCCD' });
      return;
    }

    const tenant = await tenantService.uploadIdCard(req.user!.id, frontBuffer, backBuffer);
    sendSuccess(res, tenant, 'Upload ảnh CCCD thành công');
  },

  /**
   * GET /api/v1/tenants
   * OWNER/STAFF xem danh sách người thuê
   */
  async listTenants(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { propertyId, page = '1', limit = '10', search } = req.query as {
      propertyId?: string;
      page?: string;
      limit?: string;
      search?: string;
    };

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const { tenants, total } = await tenantService.listTenants(propertyId, {
      page: pageNum,
      limit: limitNum,
      search,
    });

    const meta = buildPaginationMeta(pageNum, limitNum, total);
    sendSuccess(res, tenants, 'Lấy danh sách người thuê thành công', 200, meta);
  },

  /**
   * GET /api/v1/tenants/:id
   * OWNER/STAFF xem chi tiết người thuê
   */
  async getTenantById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const tenant = await tenantService.getTenantById(req.params.id);
    sendSuccess(res, tenant, 'Lấy thông tin người thuê thành công');
  },
};
