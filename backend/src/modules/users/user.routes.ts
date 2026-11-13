/**
 * modules/users/user.routes.ts
 * Routes cho User Management module
 */

import { Router } from 'express';
import { userController } from './user.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { upload } from '../../middlewares/upload.middleware';
import {
  updateProfileSchema,
  createUserSchema,
  updateFcmTokenSchema,
  listUsersQuerySchema,
} from './user.schema';

const router = Router();

// Tất cả routes đều cần đăng nhập
router.use(authenticate);

// ============================================================
// Profile routes - mọi user đều truy cập được
// ============================================================

/** GET /api/v1/users/profile - Xem hồ sơ cá nhân */
router.get('/profile', userController.getProfile);

/** PUT /api/v1/users/profile - Cập nhật hồ sơ */
router.put('/profile', validate(updateProfileSchema), userController.updateProfile);

/** POST /api/v1/users/avatar - Upload ảnh đại diện */
router.post('/avatar', upload.single('avatar'), userController.uploadAvatar);

/** POST /api/v1/users/fcm-token - Đăng ký push notification */
router.post(
  '/fcm-token',
  validate(updateFcmTokenSchema),
  userController.addFcmToken
);

// ============================================================
// Admin routes - chỉ OWNER
// ============================================================

/** GET /api/v1/users - Danh sách users */
router.get(
  '/',
  authorize('OWNER'),
  validate(listUsersQuerySchema, 'query'),
  userController.listUsers
);

/** POST /api/v1/users - Tạo tài khoản mới */
router.post(
  '/',
  authorize('OWNER'),
  validate(createUserSchema),
  userController.createUser
);

/** GET /api/v1/users/:id - Xem thông tin user */
router.get('/:id', authorize('OWNER', 'STAFF'), userController.getUserById);

/** PATCH /api/v1/users/:id/status - Kích hoạt/vô hiệu hóa */
router.patch(
  '/:id/status',
  authorize('OWNER'),
  userController.toggleStatus
);

export default router;
