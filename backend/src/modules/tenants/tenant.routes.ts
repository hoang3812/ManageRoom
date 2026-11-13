/**
 * modules/tenants/tenant.routes.ts
 * Routes cho Tenant Management module
 */

import { Router } from 'express';
import { tenantController } from './tenant.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { upload } from '../../middlewares/upload.middleware';
import { updateTenantProfileSchema } from './tenant.schema';

const router = Router();
router.use(authenticate);

// ============================================================
// Tenant tự quản lý hồ sơ của mình
// ============================================================

/** GET /api/v1/tenants/profile - Xem hồ sơ của mình */
router.get('/profile', authorize('TENANT'), tenantController.getMyProfile);

/** PUT /api/v1/tenants/profile - Cập nhật hồ sơ */
router.put(
  '/profile',
  authorize('TENANT'),
  validate(updateTenantProfileSchema),
  tenantController.updateMyProfile
);

/** POST /api/v1/tenants/id-card - Upload ảnh CCCD */
router.post(
  '/id-card',
  authorize('TENANT'),
  upload.fields([
    { name: 'idCardFront', maxCount: 1 },
    { name: 'idCardBack', maxCount: 1 },
  ]),
  tenantController.uploadIdCard
);

// ============================================================
// OWNER/STAFF quản lý người thuê
// ============================================================

/** GET /api/v1/tenants - Danh sách người thuê */
router.get(
  '/',
  authorize('OWNER', 'STAFF'),
  tenantController.listTenants
);

/** GET /api/v1/tenants/:id - Chi tiết người thuê */
router.get(
  '/:id',
  authorize('OWNER', 'STAFF'),
  tenantController.getTenantById
);

export default router;
