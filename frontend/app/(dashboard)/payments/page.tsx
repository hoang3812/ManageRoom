/**
 * app/(dashboard)/payments/page.tsx
 * Trang quản lý thanh toán
 * OWNER/STAFF: xác nhận thu tiền mặt, xem lịch sử
 * TENANT: tạo link VNPay, xem lịch sử
 */
'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CreditCard, CheckCircle, XCircle, Clock, Banknote, Search, ExternalLink } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { Payment, PaymentStatus } from '@/types';

const statusConfig: Record<PaymentStatus, { label: string; class: string; icon: React.ElementType }> = {
  SUCCESS: { label: 'Thành công', class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
  PENDING: { label: 'Đang xử lý', class: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
  FAILED: { label: 'Thất bại', class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
  REFUNDED: { label: 'Hoàn tiền', class: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: CreditCard },
};

const methodLabel: Record<string, string> = {
  CASH: '💵 Tiền mặt',
  VNPAY: '🏦 VNPay',
  BANK_TRANSFER: '🔄 Chuyển khoản',
};

// ============================================================
// Modal xác nhận thu tiền mặt
// ============================================================
function CashPaymentModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post('/payments/cash', {
      invoiceId,
      amount: parseFloat(amount),
      notes: notes || undefined,
    }),
    onSuccess: () => {
      toast.success('Xác nhận thanh toán thành công!');
      onSuccess();
      onClose();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Có lỗi xảy ra');
    }
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5">Xác nhận thu tiền mặt</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mã hóa đơn *</label>
            <input type="text" value={invoiceId} onChange={e => setInvoiceId(e.target.value)}
              placeholder="Nhập ID hóa đơn..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Số tiền *</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
            {amount && <p className="text-xs text-blue-600 mt-1">{formatCurrency(parseFloat(amount) || 0)}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ghi chú</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Hủy</button>
          <button onClick={() => mutation.mutate()} disabled={!invoiceId || !amount || mutation.isPending}
            className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-60">
            {mutation.isPending ? 'Đang xử lý...' : 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main Page
// ============================================================
export default function PaymentsPage() {
  const [showCashModal, setShowCashModal] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const user = useAuthStore(s => s.user);
  const isOwnerOrStaff = user?.role === 'OWNER' || user?.role === 'STAFF';

  const { data, isLoading } = useQuery({
    queryKey: ['payments', page, search],
    queryFn: () => api.get(`/payments/history?page=${page}&limit=20`).then(r => r.data),
  });

  const payments: Payment[] = data?.data?.payments || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Thanh toán</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Lịch sử và quản lý thanh toán</p>
        </div>
        {isOwnerOrStaff && (
          <button onClick={() => setShowCashModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
            <Banknote size={18} />
            Thu tiền mặt
          </button>
        )}
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Đang tải...</div>
        ) : payments.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <CreditCard size={64} className="mx-auto mb-4 opacity-20" />
            <p>Chưa có giao dịch nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase">
                <tr>
                  <th className="text-left px-5 py-3 text-gray-500 font-semibold">Mã GD</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-semibold">Hóa đơn</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-semibold">Phòng</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-semibold">Số tiền</th>
                  <th className="text-center px-5 py-3 text-gray-500 font-semibold">Phương thức</th>
                  <th className="text-center px-5 py-3 text-gray-500 font-semibold">Trạng thái</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-semibold">Ngày</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {payments.map(p => {
                  const status = statusConfig[p.status];
                  const StatusIcon = status?.icon;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-5 py-3.5 font-mono text-xs text-gray-600 dark:text-gray-400">{p.paymentCode}</td>
                      <td className="px-5 py-3.5 text-xs text-blue-600 dark:text-blue-400">
                        {(p.invoice as { invoiceCode?: string })?.invoiceCode || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-gray-700 dark:text-gray-300">
                        {(p.invoice as { contract?: { room?: { roomNumber?: string } } })?.contract?.room?.roomNumber
                          ? `Phòng ${(p.invoice as { contract?: { room?: { roomNumber?: string } } })?.contract?.room?.roomNumber}`
                          : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-gray-900 dark:text-white">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="text-xs">{methodLabel[p.method] || p.method}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {status && (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.class}`}>
                            <StatusIcon size={12} />
                            {status.label}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right text-xs text-gray-500 dark:text-gray-400">
                        {p.paidAt ? new Date(p.paidAt).toLocaleDateString('vi-VN') : new Date(p.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Trang {meta.page}/{meta.totalPages} · {meta.total} giao dịch
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">
                Trước
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={page === meta.totalPages}
                className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {showCashModal && (
        <CashPaymentModal
          onClose={() => setShowCashModal(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['payments'] })}
        />
      )}
    </div>
  );
}
