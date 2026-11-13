/**
 * modules/invoices/invoice.routes.ts
 */

import { Router } from 'express';
import { invoiceController } from './invoice.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

/** GET /api/v1/invoices/my - Tenant xem hóa đơn của mình */
router.get('/my', authorize('TENANT'), invoiceController.getMyInvoices);

/** GET /api/v1/invoices/debt-summary - Thống kê công nợ */
router.get(
  '/debt-summary',
  authorize('OWNER', 'STAFF'),
  invoiceController.getDebtSummary
);

/** GET /api/v1/invoices - Danh sách hóa đơn */
router.get('/', authorize('OWNER', 'STAFF'), invoiceController.listInvoices);

/** POST /api/v1/invoices/generate - Sinh hóa đơn */
router.post(
  '/generate',
  authorize('OWNER', 'STAFF'),
  invoiceController.generateInvoice
);

/** POST /api/v1/invoices/generate-bulk - Sinh hóa đơn hàng loạt */
router.post(
  '/generate-bulk',
  authorize('OWNER'),
  invoiceController.generateBulkInvoices
);

/** GET /api/v1/invoices/:id - Chi tiết hóa đơn */
router.get('/:id', invoiceController.getInvoiceById);

export default router;
