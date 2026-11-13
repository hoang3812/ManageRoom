'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractsService } from '@/services/contracts.service';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, X, Loader2, Search, AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Contract } from '@/types';
import { formatCurrency, formatDate, getContractStatusLabel } from '@/lib/utils';
import { roomsService } from '@/services/rooms.service';
import { tenantsService } from '@/services/tenants.service';
import dayjs from 'dayjs';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  EXPIRED: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  TERMINATED: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  ACTIVE: CheckCircle2, EXPIRED: Clock, TERMINATED: XCircle, PENDING: Clock,
};

const schema = z.object({
  roomId: z.string().min(1, 'Vui lòng chọn phòng'),
  tenantId: z.string().min(1, 'Vui lòng chọn người thuê'),
  startDate: z.string().min(1, 'Ngày bắt đầu không được để trống'),
  endDate: z.string().min(1, 'Ngày kết thúc không được để trống'),
  monthlyRent: z.string().min(1, 'Giá thuê không được để trống').transform(Number),
  deposit: z.string().default('0').transform(Number),
  terms: z.string().optional(),
});
type FormData = z.infer<typeof schema>;
type FormInput = z.input<typeof schema>;

function ContractModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: rooms } = useQuery({ queryKey: ['rooms-available'], queryFn: () => roomsService.getAll({ status: 'AVAILABLE', limit: 100 }) });
  const { data: tenants } = useQuery({ queryKey: ['tenants-list'], queryFn: () => tenantsService.getAll({ limit: 100 }) });

  const { register, handleSubmit, formState: { errors } } = useForm<FormInput>({ resolver: zodResolver(schema) as any });

  const mutation = useMutation({
    mutationFn: (data: FormInput) => contractsService.create(data as Record<string, unknown>),
    onSuccess: () => { toast.success('Tạo hợp đồng thành công'); qc.invalidateQueries({ queryKey: ['contracts'] }); onClose(); },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Thao tác thất bại'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Tạo hợp đồng mới</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phòng *</label>
            <select {...register('roomId')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">-- Chọn phòng trống --</option>
              {rooms?.data.map(r => <option key={r.id} value={r.id}>Phòng {r.roomNumber} – {r.property?.name} ({formatCurrency(r.basePrice)}/tháng)</option>)}
            </select>
            {errors.roomId && <p className="text-xs text-red-500 mt-1">{errors.roomId.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Người thuê *</label>
            <select {...register('tenantId')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">-- Chọn người thuê --</option>
              {tenants?.data.map(t => <option key={t.id} value={t.id}>{t.user.fullName} ({t.user.email})</option>)}
            </select>
            {errors.tenantId && <p className="text-xs text-red-500 mt-1">{errors.tenantId.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ngày bắt đầu *</label>
              <input {...register('startDate')} type="date" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ngày kết thúc *</label>
              <input {...register('endDate')} type="date" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Giá thuê/tháng (đ) *</label>
              <input {...register('monthlyRent')} type="number" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="3500000" />
              {errors.monthlyRent && <p className="text-xs text-red-500 mt-1">{errors.monthlyRent.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tiền cọc (đ)</label>
              <input {...register('deposit')} type="number" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="7000000" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Điều khoản hợp đồng</label>
            <textarea {...register('terms')} rows={4} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Các điều khoản và điều kiện..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium">Hủy</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
              {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Tạo hợp đồng
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ContractsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['contracts', search, statusFilter, page],
    queryFn: () => contractsService.getAll({ search: search || undefined, status: statusFilter || undefined, page, limit: 10 }),
  });

  const terminateMutation = useMutation({
    mutationFn: (id: string) => contractsService.terminate(id, 'Chấm dứt hợp đồng theo yêu cầu'),
    onSuccess: () => { toast.success('Đã chấm dứt hợp đồng'); qc.invalidateQueries({ queryKey: ['contracts'] }); },
    onError: () => toast.error('Thao tác thất bại'),
  });

  const isExpiringSoon = (endDate: string) => dayjs(endDate).diff(dayjs(), 'day') <= 30 && dayjs(endDate).isAfter(dayjs());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hợp đồng</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Quản lý hợp đồng thuê phòng</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={16} /> Tạo hợp đồng
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Tìm theo mã HĐ..." />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE">Đang hiệu lực</option>
          <option value="PENDING">Chờ xác nhận</option>
          <option value="EXPIRED">Đã hết hạn</option>
          <option value="TERMINATED">Đã chấm dứt</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-gray-400">Đang tải...</div> : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                {['Mã HĐ', 'Người thuê', 'Phòng', 'Thời hạn', 'Giá thuê', 'Trạng thái', 'Thao tác'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {data?.data.map(c => {
                const expiring = isExpiringSoon(c.endDate) && c.status === 'ACTIVE';
                const StatusIcon = STATUS_ICONS[c.status] || Clock;
                return (
                  <tr key={c.id} className={`hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors ${expiring ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                    <td className="px-5 py-4 text-sm font-mono text-gray-900 dark:text-white">{c.contractCode}</td>
                    <td className="px-5 py-4 text-sm">
                      <p className="font-medium text-gray-900 dark:text-white">{c.tenant?.user.fullName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{c.tenant?.user.phone}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                      <p>Phòng {c.room?.roomNumber}</p>
                      <p className="text-xs text-gray-500">{c.room?.property?.name}</p>
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <p className="text-gray-700 dark:text-gray-300">{formatDate(c.startDate)} → {formatDate(c.endDate)}</p>
                      {expiring && (
                        <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                          <AlertTriangle size={11} /> Sắp hết hạn
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(c.monthlyRent)}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                        <StatusIcon size={11} />
                        {getContractStatusLabel(c.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {c.status === 'ACTIVE' && (
                        <button onClick={() => { if (confirm('Chấm dứt hợp đồng này?')) terminateMutation.mutate(c.id); }}
                          className="px-3 py-1.5 text-xs border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          Chấm dứt
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {data?.meta && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>Tổng {data.meta.total} hợp đồng</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40">← Trước</button>
            <span className="px-3 py-1.5">Trang {page}/{data.meta.totalPages}</span>
            <button disabled={page === data.meta.totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40">Sau →</button>
          </div>
        </div>
      )}

      {showModal && <ContractModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
