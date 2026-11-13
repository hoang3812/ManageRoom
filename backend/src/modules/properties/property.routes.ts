/**
 * modules/properties/property.routes.ts
 * Routes cho Property và Room Management
 * 
 * Base: /api/v1/properties
 */

import { Router } from 'express';
import { propertyController } from './property.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { upload } from '../../middlewares/upload.middleware';
import {
  createPropertySchema,
  updatePropertySchema,
  createRoomSchema,
  updateRoomSchema,
  listRoomsQuerySchema,
  listPropertiesQuerySchema,
  createServiceFeeSchema,
  createRoomTypeSchema,
} from './property.schema';

const router = Router();
router.use(authenticate);

// ============================================================
// Room Type Routes
// ============================================================

/** GET /api/v1/properties/room-types */
router.get('/room-types', propertyController.getRoomTypes);

/** POST /api/v1/properties/room-types */
router.post(
  '/room-types',
  authorize('OWNER'),
  validate(createRoomTypeSchema),
  propertyController.createRoomType
);

// ============================================================
// Property Routes
// ============================================================

/** GET /api/v1/properties - Danh sách khu trọ của owner */
router.get(
  '/',
  authorize('OWNER', 'STAFF'),
  validate(listPropertiesQuerySchema, 'query'),
  propertyController.getMyProperties
);

/** POST /api/v1/properties - Tạo khu trọ mới */
router.post(
  '/',
  authorize('OWNER'),
  validate(createPropertySchema),
  propertyController.createProperty
);

/** GET /api/v1/properties/:id - Chi tiết khu trọ */
router.get('/:id', authorize('OWNER', 'STAFF'), propertyController.getPropertyById);

/** PUT /api/v1/properties/:id - Cập nhật khu trọ */
router.put(
  '/:id',
  authorize('OWNER'),
  validate(updatePropertySchema),
  propertyController.updateProperty
);

/** POST /api/v1/properties/:id/images - Upload ảnh khu trọ */
router.post(
  '/:id/images',
  authorize('OWNER'),
  upload.array('images', 10),
  propertyController.uploadPropertyImages
);

// ============================================================
// Service Fee Routes (phí dịch vụ của khu trọ)
// ============================================================

/** GET /api/v1/properties/:propertyId/service-fees */
router.get('/:propertyId/service-fees', propertyController.getServiceFees);

/** POST /api/v1/properties/:propertyId/service-fees */
router.post(
  '/:propertyId/service-fees',
  authorize('OWNER'),
  validate(createServiceFeeSchema),
  propertyController.createServiceFee
);

// ============================================================
// Room Routes (lồng trong property)
// ============================================================

/** GET /api/v1/properties/:propertyId/rooms - Danh sách phòng */
router.get(
  '/:propertyId/rooms',
  validate(listRoomsQuerySchema, 'query'),
  propertyController.getRoomsByProperty
);

/** POST /api/v1/properties/:propertyId/rooms - Tạo phòng */
router.post(
  '/:propertyId/rooms',
  authorize('OWNER'),
  validate(createRoomSchema),
  propertyController.createRoom
);

// ============================================================
// Room Detail Routes (trực tiếp theo roomId)
// ============================================================

/** GET /api/v1/properties/rooms/:id - Chi tiết phòng */
router.get('/rooms/:id', propertyController.getRoomById);

/** PUT /api/v1/properties/rooms/:id - Cập nhật phòng */
router.put(
  '/rooms/:id',
  authorize('OWNER'),
  validate(updateRoomSchema),
  propertyController.updateRoom
);

/** PATCH /api/v1/properties/rooms/:id/status - Đổi trạng thái phòng */
router.patch(
  '/rooms/:id/status',
  authorize('OWNER', 'STAFF'),
  propertyController.updateRoomStatus
);

export default router;
