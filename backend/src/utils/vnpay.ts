import crypto from 'crypto';
import { env } from '../config/env';

export interface VNPayParams {
  amount: number;       // VNĐ
  orderInfo: string;
  orderId: string;      // unique transaction ref
  returnUrl?: string;
  ipAddr: string;
  locale?: 'vn' | 'en';
}

const formatDate = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
};

export const createVNPayUrl = (params: VNPayParams): string => {
  const tmnCode = env.VNPAY_TMN_CODE || '';
  const secretKey = env.VNPAY_HASH_SECRET || '';
  const vnpUrl = env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  const returnUrl = params.returnUrl || env.VNPAY_RETURN_URL || '';

  const createDate = formatDate(new Date());

  const vnpParams: Record<string, string> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Locale: params.locale || 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: params.orderId,
    vnp_OrderInfo: params.orderInfo,
    vnp_OrderType: 'other',
    vnp_Amount: String(params.amount * 100), // VNPay requires amount * 100
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: params.ipAddr,
    vnp_CreateDate: createDate,
  };

  // Sort params alphabetically
  const sortedKeys = Object.keys(vnpParams).sort();
  const signData = sortedKeys.map(k => `${k}=${encodeURIComponent(vnpParams[k]).replace(/%20/g, '+')}`).join('&');

  const hmac = crypto.createHmac('sha512', secretKey);
  const signature = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  const queryString = sortedKeys.map(k => `${k}=${encodeURIComponent(vnpParams[k]).replace(/%20/g, '+')}`).join('&');
  return `${vnpUrl}?${queryString}&vnp_SecureHash=${signature}`;
};

export const verifyVNPayCallback = (query: Record<string, string>): boolean => {
  const secretKey = env.VNPAY_HASH_SECRET || '';
  const secureHash = query['vnp_SecureHash'];

  const vnpParams = { ...query };
  delete vnpParams['vnp_SecureHash'];
  delete vnpParams['vnp_SecureHashType'];

  const sortedKeys = Object.keys(vnpParams).sort();
  const signData = sortedKeys
    .map(k => `${k}=${encodeURIComponent(vnpParams[k]).replace(/%20/g, '+')}`)
    .join('&');

  const hmac = crypto.createHmac('sha512', secretKey);
  const expected = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  return secureHash === expected;
};
