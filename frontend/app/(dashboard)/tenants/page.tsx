'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantsService } from '@/services/tenants.service';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Users, Search, X, Loader2, Phone, Mail } from 'lucide-react';
import { Tenant } from '@/types';
import { formatDate, getInitials } from '@/lib/utils';
import api from '@/lib/api';

const schema = z.object({
  fullName: z.string().min(2, 'Họ tên tối thiểu 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự').optional(),
  idCardNumber: z.string().optional(),
  occupation: z.string().optional(),
  permanentAddress: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

function TenantModal({ tenant, onClose }: { tenant?: Tenant; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: tenant ? {
      fullName: tenant.user.fullName,
      email: tenant.user.email,
      phone: tenant.user.phone,
      idCardNumber: tenant.idCardNumber,
      occupation: tenant.occupation,
      permanentAddress: tenant.permanentAddress,
      emergencyContact: tenant.emergencyContact,
      emergencyPhone: tenant.emergencyPhone,
    } : {},
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (tenant) return tenantsService.update(tenant.id, data);
      const res = await api.post('/auth/register', { ...data, role: 'TENANT' });
      return res.data.data;
    },
    onSuccess: () => {
      toast.success(tenant ? 'Cập nhật người thuê thành công' : 'Thêm người thuê thành công');
      qc.invalidateQueries({ queryKey: ['tenants'] });
      onClose();
    },
    onError: (err: unknown) => {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Thao tác thất bại');
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{tenant ? 'Chỉnh sửa người thuê' : 'Thêm người thuê'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Họ và tên *</label>
              <input {...register('fullName')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nguyễn Văn A" />
              {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
              <input {...register('email')} type="email" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="tenant@email.com" />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Số điện thoại</label>
              <input {...register('phone')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0901234567" />
            </div>
            {!tenant && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mật khẩu *</label>
                <input {...register('password')} type="password" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Mật khẩu ban đầu" />
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Số CCCD/CMND</label>
              <input {...register('idCardNumber')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="012345678901" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nghề nghiệp</label>
              <input {...register('occupation')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nhân viên văn phòng" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Địa chỉ thường trú</label>
              <input {...register('permanentAddress')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="123 Đường ABC, Quận 1..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Liên hệ khẩn cấp</label>
              <input {...register('emergencyContact')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nguyễn Thị B (mẹ)" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SĐT khẩn cấp</label>
              <input {...register('emergencyPhone')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0987654321" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium">Hủy</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
              {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
              {tenant ? 'Cập nhật' : 'Thêm mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TenantsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; tenant?: Tenant }>({ open: false });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['tenants', search, page],
    queryFn: () => tenantsService.getAll({ search: search || undefined, page, limit: 10 }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Người thuê</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Quản lý hồ sơ người thuê trọ</p>
        </div>
        <button onClick={() => setModal({ open: true })} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={16} /> Thêm người thuê
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="w-full max-w-sm pl-9 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Tìm theo tên, email..." />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 animate-pulse">Đang tải...</div>
        ) : data?.data.length === 0 ? (
          <div className="p-16 text-center">
            <Users size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 dark:text-gray-400">Chưa có người thuê nào</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                {['Người thuê', 'Liên hệ', 'CCCD/CMND', 'Nghề nghiệp', 'Ngày tạo', 'Thao tác'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {data?.data.map(t => (
                <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-sm">
                        {getInitials(t.user.fullName)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{t.user.fullName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t.user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {t.user.phone ? <span className="flex items-center gap-1"><Phone size={12} />{t.user.phone}</span> : '—'}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">{t.idCardNumber || '—'}</td>
                  <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">{t.occupation || '—'}</td>
                  <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">{formatDate(t.createdAt)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setModal({ open: true, tenant: t })} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => { if (confirm('Xóa người thuê này?')) tenantsService.delete(t.id).then(() => { toast.success('Đã xóa'); qc.invalidateQueries({ queryKey: ['tenants'] }); }).catch(() => toast.error('Xóa thất bại')); }}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data?.meta && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>Tổng {data.meta.total} người thuê</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40">← Trước</button>
            <span className="px-3 py-1.5">Trang {page}/{data.meta.totalPages}</span>
            <button disabled={page === data.meta.totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40">Sau →</button>
          </div>
        </div>
      )}

      {modal.open && <TenantModal tenant={modal.tenant} onClose={() => setModal({ open: false })} />}
    </div>
  );
}
