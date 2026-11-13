'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesService } from '@/services/invoices.service';
import { paymentsService } from '@/services/payments.service';
import { propertiesService } from '@/services/properties.service';
import { toast } from 'sonner';
import { Receipt, Plus, Search, Loader2, X, CheckCircle2, Clock, AlertTriangle, XCircle, CreditCard, DollarSign } from 'lucide-react';
import { Invoice } from '@/types';
import { formatCurrency, formatDate, getInvoiceStatusLabel } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PAID: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  OVERDUE: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  CANCELLED: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

function GenerateModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: properties } = useQuery({ queryKey: ['properties-simple'], queryFn: () => propertiesService.getAll() });
  const [form, setForm] = useState({ propertyId: '', month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!form.propertyId) { toast.error('Vui lòng chọn khu trọ'); return; }
    setLoading(true);
    try {
      const result = await invoicesService.generate(form as { propertyId: string; month: number; year: number });
      toast.success(`Đã tạo ${Array.isArray(result) ? result.length : 0} hóa đơn`);
      qc.invalidateQueries({ queryKey: ['invoices'] });
      onClose();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Tạo hóa đơn thất bại');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Tạo hóa đơn tháng</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Khu trọ *</label>
            <select value={form.propertyId} onChange={e => setForm(f => ({ ...f, propertyId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">-- Chọn khu trọ --</option>
              {properties?.data.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tháng</label>
              <select value={form.month} onChange={e => setForm(f => ({ ...f, month: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>Tháng {m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Năm</label>
              <select value={form.year} onChange={e => setForm(f => ({ ...f, year: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium">Hủy</button>
            <button onClick={handleGenerate} disabled={loading} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
              {loading && <Loader2 size={14} className="animate-spin" />}
              Tạo hóa đơn
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const qc = useQueryClient();
  const [method, setMethod] = useState<'CASH' | 'VNPAY'>('CASH');
  const [loading, setLoading] = useState(false);
  const remaining = invoice.totalAmount - invoice.paidAmount;

  const handlePay = async () => {
    setLoading(true);
    try {
      if (method === 'CASH') {
        await paymentsService.recordCash({ invoiceId: invoice.id, amount: remaining });
        toast.success('Ghi nhận thanh toán tiền mặt thành công');
        qc.invalidateQueries({ queryKey: ['invoices'] });
        onClose();
      } else {
        const result = await paymentsService.createVNPay({ invoiceId: invoice.id, amount: remaining });
        if (result?.paymentUrl) window.open(result.paymentUrl, '_blank');
        onClose();
      }
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Thanh toán thất bại');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Ghi nhận thanh toán</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Mã hóa đơn: <span className="font-mono text-gray-900 dark:text-white">{invoice.invoiceCode}</span></p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(remaining)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Số tiền còn phải thu</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phương thức thanh toán</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setMethod('CASH')} className={`flex items-center gap-2 p-3 border-2 rounded-xl text-sm font-medium transition-colors ${method === 'CASH' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}>
                <DollarSign size={16} /> Tiền mặt
              </button>
              <button onClick={() => setMethod('VNPAY')} className={`flex items-center gap-2 p-3 border-2 rounded-xl text-sm font-medium transition-colors ${method === 'VNPAY' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}>
                <CreditCard size={16} /> VNPay
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium">Hủy</button>
            <button onClick={handlePay} disabled={loading} className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
              {loading && <Loader2 size={14} className="animate-spin" />}
              Xác nhận
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InvoicesPage() {
  const [showGenerate, setShowGenerate] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', statusFilter, search, page],
    queryFn: () => invoicesService.getAll({ status: statusFilter || undefined, search: search || undefined, page, limit: 15 }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hóa đơn</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Quản lý hóa đơn thuê phòng hàng tháng</p>
        </div>
        <button onClick={() => setShowGenerate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={16} /> Tạo hóa đơn tháng
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Tìm theo mã hóa đơn..." />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">Nháp</option>
          <option value="SENT">Đã gửi</option>
          <option value="PAID">Đã thanh toán</option>
          <option value="OVERDUE">Quá hạn</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-gray-400">Đang tải...</div> : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                {['Mã HĐ', 'Người thuê / Phòng', 'Tháng', 'Tổng tiền', 'Đã trả', 'Hạn TT', 'Trạng thái', 'Thao tác'].map(h => (
                  <th key={h} className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {data?.data.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3.5 text-sm font-mono text-gray-900 dark:text-white">{inv.invoiceCode}</td>
                  <td className="px-4 py-3.5 text-sm">
                    <p className="font-medium text-gray-900 dark:text-white">{(inv.contract as { tenant?: { user?: { fullName?: string } } })?.tenant?.user?.fullName || '—'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Phòng {(inv.contract as { room?: { roomNumber?: string } })?.room?.roomNumber}</p>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-600 dark:text-gray-400">{inv.month}/{inv.year}</td>
                  <td className="px-4 py-3.5 text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(inv.totalAmount)}</td>
                  <td className="px-4 py-3.5 text-sm">
                    <span className={`font-semibold ${inv.paidAmount >= inv.totalAmount ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                      {formatCurrency(inv.paidAmount)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-600 dark:text-gray-400">{formatDate(inv.dueDate)}</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[inv.status]}`}>
                      {getInvoiceStatusLabel(inv.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {['SENT', 'OVERDUE', 'DRAFT'].includes(inv.status) && inv.paidAmount < inv.totalAmount && (
                      <button onClick={() => setPayingInvoice(inv)}
                        className="px-3 py-1.5 text-xs border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex items-center gap-1">
                        <CreditCard size={12} /> Thu tiền
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data?.meta && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>Tổng {data.meta.total} hóa đơn</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40">← Trước</button>
            <span className="px-3 py-1.5">Trang {page}/{data.meta.totalPages}</span>
            <button disabled={page === data.meta.totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40">Sau →</button>
          </div>
        </div>
      )}

      {showGenerate && <GenerateModal onClose={() => setShowGenerate(false)} />}
      {payingInvoice && <PaymentModal invoice={payingInvoice} onClose={() => setPayingInvoice(null)} />}
    </div>
  );
}
