import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import * as controller from './report.controller';

const router = Router();

router.use(authenticate, authorize('OWNER', 'STAFF'));

router.get('/revenue', controller.getRevenueReport);
router.get('/revenue/export', controller.exportRevenueExcel);
router.get('/occupancy', controller.getOccupancyReport);
router.get('/debt', controller.getDebtReport);
router.get('/debt/export', controller.exportDebtExcel);

export default router;
