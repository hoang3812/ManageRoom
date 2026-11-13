import api from '@/lib/api';
import { ApiResponse, Payment } from '@/types';

export const paymentsService = {
  getAll: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<Payment[]>>('/payments', { params }).then(r => ({ data: r.data.data!, meta: r.data.meta! })),

  recordCash: (data: { invoiceId: string; amount: number; notes?: string }) =>
    api.post<ApiResponse<Payment>>('/payments/cash', data).then(r => r.data.data!),

  createVNPay: (data: { invoiceId: string; amount: number }) =>
    api.post<ApiResponse<{ paymentUrl: string }>>('/payments/vnpay', data).then(r => r.data.data!),
};
