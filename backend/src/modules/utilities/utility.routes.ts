/**
 * modules/utilities/utility.routes.ts
 * Routes cho Utility Management (chỉ số điện nước)
 */

import { Router } from 'express';
import { utilityController } from './utility.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createUtilityReadingSchema } from './utility.schema';

const router = Router();
router.use(authenticate);

/**
 * POST /api/v1/utilities/readings
 * Nhập chỉ số điện nước (tạo mới hoặc cập nhật)
 */
router.post(
  '/readings',
  authorize('OWNER', 'STAFF'),
  validate(createUtilityReadingSchema),
  utilityController.createOrUpdateReading
);

/**
 * GET /api/v1/utilities/rooms/:roomId/readings
 * Lịch sử chỉ số của một phòng
 */
router.get(
  '/rooms/:roomId/readings',
  utilityController.getReadingsByRoom
);

/**
 * GET /api/v1/utilities/rooms/:roomId/readings/month?month=1&year=2024
 * Chỉ số tháng cụ thể
 */
router.get(
  '/rooms/:roomId/readings/month',
  utilityController.getReadingByMonth
);

/**
 * GET /api/v1/utilities/properties/:propertyId/readings/month?month=1&year=2024
 * Chỉ số toàn bộ khu trọ trong tháng
 */
router.get(
  '/properties/:propertyId/readings/month',
  authorize('OWNER', 'STAFF'),
  utilityController.getPropertyReadingsByMonth
);

export default router;
