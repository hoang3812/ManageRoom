/**
 * modules/contracts/contract.routes.ts
 * Routes cho Contract Management
 */

import { Router } from 'express';
import { contractController } from './contract.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createContractSchema,
  renewContractSchema,
  terminateContractSchema,
} from './contract.schema';

const router = Router();
router.use(authenticate);

/** GET /api/v1/contracts/my - Tenant xem hợp đồng của mình */
router.get('/my', authorize('TENANT'), contractController.getMyContracts);

/** GET /api/v1/contracts - OWNER/STAFF xem tất cả hợp đồng */
router.get('/', authorize('OWNER', 'STAFF'), contractController.listContracts);

/** POST /api/v1/contracts - Tạo hợp đồng mới */
router.post(
  '/',
  authorize('OWNER'),
  validate(createContractSchema),
  contractController.createContract
);

/** GET /api/v1/contracts/:id - Chi tiết hợp đồng */
router.get('/:id', contractController.getContractById);

/** POST /api/v1/contracts/:id/renew - Gia hạn hợp đồng */
router.post(
  '/:id/renew',
  authorize('OWNER'),
  validate(renewContractSchema),
  contractController.renewContract
);

/** POST /api/v1/contracts/:id/terminate - Chấm dứt hợp đồng */
router.post(
  '/:id/terminate',
  authorize('OWNER'),
  validate(terminateContractSchema),
  contractController.terminateContract
);

export default router;
