/**
 * modules/payments/payment.routes.ts
 */

import { Router } from 'express';
import { paymentController } from './payment.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();

/** GET /api/v1/payments/vnpay/callback - VNPay callback (public, không cần token) */
router.get('/vnpay/callback', paymentController.vnpayCallback);

// Các routes khác cần auth
router.use(authenticate);

/** POST /api/v1/payments/cash - Thanh toán tiền mặt */
router.post('/cash', authorize('OWNER', 'STAFF'), paymentController.createCashPayment);

/** POST /api/v1/payments/vnpay/create - Tạo link VNPay */
router.post('/vnpay/create', authorize('TENANT'), paymentController.createVNPayPayment);

/** GET /api/v1/payments/history - Lịch sử thanh toán */
router.get('/history', paymentController.getPaymentHistory);

export default router;
