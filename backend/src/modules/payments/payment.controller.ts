/**
 * modules/payments/payment.controller.ts + payment.routes.ts
 */

import { Response, Request } from 'express';
import { paymentService } from './payment.service';
import { sendSuccess } from '../../utils/response';
import { buildPaginationMeta } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

export const paymentController = {
  /**
   * POST /api/v1/payments/cash
   * Xác nhận thanh toán tiền mặt (OWNER/STAFF)
   */
  async createCashPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { invoiceId, amount, notes } = req.body as {
      invoiceId: string;
      amount: number;
      notes?: string;
    };
    const payment = await paymentService.createCashPayment(
      invoiceId,
      amount,
      req.user!.id,
      notes
    );
    sendSuccess(res, payment, 'Xác nhận thanh toán thành công', 201);
  },

  /**
   * POST /api/v1/payments/vnpay/create
   * Tenant tạo link thanh toán VNPay
   */
  async createVNPayPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { invoiceId } = req.body as { invoiceId: string };
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const result = await paymentService.createVNPayPayment(
      invoiceId,
      req.user!.id,
      clientIp.split(',')[0].trim()
    );
    sendSuccess(res, result, 'Tạo link thanh toán thành công');
  },

  /**
   * GET /api/v1/payments/vnpay/callback
   * Callback từ VNPay sau khi thanh toán (public route)
   */
  async vnpayCallback(req: Request, res: Response): Promise<void> {
    const vnpayData = req.query as Record<string, string>;
    const result = await paymentService.handleVNPayCallback(vnpayData);

    // Redirect về frontend với kết quả
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = result.success
      ? `${frontendUrl}/payment/success?txn=${result.transactionId}`
      : `${frontendUrl}/payment/failed?txn=${result.transactionId}`;

    res.redirect(redirectUrl);
  },

  /**
   * GET /api/v1/payments/history
   */
  async getPaymentHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { page = '1', limit = '10', invoiceId } = req.query as {
      page?: string; limit?: string; invoiceId?: string;
    };
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const { payments, total } = await paymentService.getPaymentHistory(req.user!.id, {
      page: pageNum,
      limit: limitNum,
      invoiceId,
    });

    const meta = buildPaginationMeta(pageNum, limitNum, total);
    sendSuccess(res, payments, 'Lấy lịch sử thanh toán thành công', 200, meta);
  },
};
