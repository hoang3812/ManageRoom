/**
 * modules/payments/payment.service.ts
 * Business logic cho Payment Management
 * Hỗ trợ: thanh toán tiền mặt, VNPay, xác nhận thanh toán
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import { env } from '../../config/env';
import { calculateSkip } from '../../utils/response';
import { generatePaymentCode, getNextSequence } from '../../utils/code-generator';
import logger from '../../utils/logger';

export const paymentService = {
  /**
   * Tạo thanh toán tiền mặt
   * OWNER/STAFF xác nhận nhận tiền mặt từ tenant
   */
  async createCashPayment(
    invoiceId: string,
    amount: number,
    userId: string,
    notes?: string
  ) {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        status: { in: ['SENT', 'OVERDUE'] },
        contract: {
          room: {
            property: {
              OR: [
                { ownerId: userId },
                { staff: { some: { id: userId } } },
              ],
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new AppError('Không tìm thấy hóa đơn hoặc hóa đơn đã thanh toán', 404);
    }

    if (amount > invoice.totalAmount - invoice.paidAmount) {
      throw new AppError('Số tiền thanh toán vượt quá số tiền còn lại', 400);
    }

    // Tạo mã thanh toán
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const payCount = await prisma.payment.count({ where: { createdAt: { gte: today } } });
    const paymentCode = generatePaymentCode(getNextSequence(payCount));

    const newPaidAmount = invoice.paidAmount + amount;
    const isFullyPaid = newPaidAmount >= invoice.totalAmount;

    const payment = await prisma.$transaction(async (tx) => {
      // Tạo bản ghi thanh toán
      const pay = await tx.payment.create({
        data: {
          paymentCode,
          invoiceId,
          amount,
          method: 'CASH',
          status: 'SUCCESS',
          paidAt: new Date(),
          notes,
        },
      });

      // Cập nhật số tiền đã thanh toán trong hóa đơn
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaidAmount,
          status: isFullyPaid ? 'PAID' : 'SENT',
        },
      });

      return pay;
    });

    logger.info(`Thanh toán tiền mặt ${paymentCode}: ${amount.toLocaleString('vi-VN')}đ`);
    return payment;
  },

  /**
   * Tạo link thanh toán VNPay
   * Tenant nhấn vào link này để thanh toán online
   */
  async createVNPayPayment(invoiceId: string, userId: string, clientIp: string) {
    // Kiểm tra invoice thuộc về tenant này
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        status: { in: ['SENT', 'OVERDUE'] },
        contract: { tenant: { userId } },
      },
    });

    if (!invoice) {
      throw new AppError('Không tìm thấy hóa đơn', 404);
    }

    if (!env.VNPAY_TMN_CODE || !env.VNPAY_HASH_SECRET) {
      throw new AppError('Chưa cấu hình VNPay', 500);
    }

    // Tạo bản ghi payment pending
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const payCount = await prisma.payment.count({ where: { createdAt: { gte: today } } });
    const paymentCode = generatePaymentCode(getNextSequence(payCount));
    const remainingAmount = invoice.totalAmount - invoice.paidAmount;
    const transactionId = uuidv4().replace(/-/g, '').substring(0, 8);

    await prisma.payment.create({
      data: {
        paymentCode,
        invoiceId,
        amount: remainingAmount,
        method: 'VNPAY',
        status: 'PENDING',
        transactionId,
      },
    });

    // Tạo URL thanh toán VNPay
    const vnpUrl = buildVNPayUrl({
      amount: remainingAmount,
      orderId: transactionId,
      orderInfo: `Thanh toan hoa don ${invoice.id.slice(0, 8)}`,
      clientIp,
      returnUrl: env.VNPAY_RETURN_URL || '',
      tmnCode: env.VNPAY_TMN_CODE,
      hashSecret: env.VNPAY_HASH_SECRET,
      vnpUrl: env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    });

    return { paymentUrl: vnpUrl, paymentCode, transactionId };
  },

  /**
   * Xử lý callback từ VNPay sau khi thanh toán
   */
  async handleVNPayCallback(vnpayData: Record<string, string>) {
    // Xác thực chữ ký VNPay
    const isValid = verifyVNPaySignature(vnpayData, env.VNPAY_HASH_SECRET || '');
    if (!isValid) {
      throw new AppError('Chữ ký VNPay không hợp lệ', 400);
    }

    const transactionId = vnpayData['vnp_TxnRef'];
    const responseCode = vnpayData['vnp_ResponseCode'];

    // Tìm payment theo transactionId
    const payment = await prisma.payment.findFirst({
      where: { transactionId, status: 'PENDING' },
      include: { invoice: true },
    });

    if (!payment) {
      throw new AppError('Không tìm thấy giao dịch', 404);
    }

    const isSuccess = responseCode === '00';

    await prisma.$transaction(async (tx) => {
      // Cập nhật payment
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: isSuccess ? 'SUCCESS' : 'FAILED',
          paidAt: isSuccess ? new Date() : null,
          vnpayData: vnpayData as object,
        },
      });

      if (isSuccess) {
        const newPaidAmount = payment.invoice.paidAmount + payment.amount;
        const isFullyPaid = newPaidAmount >= payment.invoice.totalAmount;

        // Cập nhật hóa đơn
        await tx.invoice.update({
          where: { id: payment.invoiceId },
          data: {
            paidAmount: newPaidAmount,
            status: isFullyPaid ? 'PAID' : 'SENT',
          },
        });
      }
    });

    logger.info(`VNPay callback: ${transactionId} - ${isSuccess ? 'SUCCESS' : 'FAILED'}`);
    return { success: isSuccess, transactionId };
  },

  /**
   * Lấy lịch sử thanh toán
   */
  async getPaymentHistory(
    userId: string,
    query: { page: number; limit: number; invoiceId?: string }
  ) {
    const { page = 1, limit = 10, invoiceId } = query;
    const skip = calculateSkip(page, limit);

    const where = {
      invoice: {
        OR: [
          // Owner/Staff xem tất cả payments
          {
            contract: {
              room: {
                property: {
                  OR: [
                    { ownerId: userId },
                    { staff: { some: { id: userId } } },
                  ],
                },
              },
            },
          },
          // Tenant chỉ xem payments của mình
          { contract: { tenant: { userId } } },
        ],
      },
      ...(invoiceId && { invoiceId }),
    };

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          invoice: {
            select: {
              invoiceCode: true,
              month: true,
              year: true,
              contract: {
                select: {
                  room: { select: { roomNumber: true } },
                },
              },
            },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return { payments, total };
  },
};

// ============================================================
// VNPay Helper Functions
// ============================================================

/**
 * Sắp xếp và mã hóa tham số VNPay
 */
function buildVNPayUrl(params: {
  amount: number;
  orderId: string;
  orderInfo: string;
  clientIp: string;
  returnUrl: string;
  tmnCode: string;
  hashSecret: string;
  vnpUrl: string;
}): string {
  const createDate = new Date()
    .toISOString()
    .replace(/[-:T.Z]/g, '')
    .slice(0, 14); // YYYYMMDDHHmmss

  const vnpParams: Record<string, string> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: params.tmnCode,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: params.orderId,
    vnp_OrderInfo: params.orderInfo,
    vnp_OrderType: 'other',
    vnp_Amount: String(Math.round(params.amount) * 100), // VNPay nhân 100
    vnp_ReturnUrl: params.returnUrl,
    vnp_IpAddr: params.clientIp,
    vnp_CreateDate: createDate,
  };

  // Sắp xếp theo thứ tự alphabet
  const sortedKeys = Object.keys(vnpParams).sort();
  const signData = sortedKeys
    .map((key) => `${key}=${encodeURIComponent(vnpParams[key])}`)
    .join('&');

  // Tạo chữ ký HMAC-SHA512
  const hmac = crypto.createHmac('sha512', params.hashSecret);
  const signature = hmac.update(signData).digest('hex');

  return `${params.vnpUrl}?${signData}&vnp_SecureHash=${signature}`;
}

/**
 * Xác thực chữ ký trong response của VNPay
 */
function verifyVNPaySignature(
  data: Record<string, string>,
  hashSecret: string
): boolean {
  const secureHash = data['vnp_SecureHash'];
  const params = { ...data };
  delete params['vnp_SecureHash'];
  delete params['vnp_SecureHashType'];

  const sortedKeys = Object.keys(params).sort();
  const signData = sortedKeys
    .map((key) => `${key}=${encodeURIComponent(params[key])}`)
    .join('&');

  const hmac = crypto.createHmac('sha512', hashSecret);
  const calculatedHash = hmac.update(signData).digest('hex');

  return calculatedHash === secureHash;
}
