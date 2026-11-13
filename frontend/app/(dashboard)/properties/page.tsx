'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { propertiesService } from '@/services/properties.service';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Building2, MapPin, DoorOpen, Eye, X, Loader2 } from 'lucide-react';
import { Property } from '@/types';
import Link from 'next/link';

const schema = z.object({
  name: z.string().min(2, 'Tên khu trọ tối thiểu 2 ký tự'),
  address: z.string().min(5, 'Địa chỉ không hợp lệ'),
  ward: z.string().optional(),
  district: z.string().optional(),
  province: z.string().min(2, 'Tỉnh/Thành phố không được để trống'),
  description: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

function PropertyModal({ property, onClose }: { property?: Property; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: property ? {
      name: property.name, address: property.address, ward: property.ward,
      district: property.district, province: property.province, description: property.description,
    } : {},
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      property ? propertiesService.update(property.id, data) : propertiesService.create(data),
    onSuccess: () => {
      toast.success(property ? 'Cập nhật khu trọ thành công' : 'Tạo khu trọ thành công');
      qc.invalidateQueries({ queryKey: ['properties'] });
      onClose();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Thao tác thất bại';
      toast.error(msg);
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {property ? 'Chỉnh sửa khu trọ' : 'Thêm khu trọ mới'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tên khu trọ *</label>
            <input {...register('name')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nhà trọ Minh Tâm" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Địa chỉ *</label>
            <input {...register('address')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="123 Đường Lê Lợi" />
            {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address.message}</p>}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phường/Xã</label>
              <input {...register('ward')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="P. Bến Nghé" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quận/Huyện</label>
              <input {...register('district')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Q.1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tỉnh/TP *</label>
              <input {...register('province')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="TP.HCM" />
              {errors.province && <p className="text-xs text-red-500 mt-1">{errors.province.message}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mô tả</label>
            <textarea {...register('description')} rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Thông tin thêm về khu trọ..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Hủy</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
              {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
              {property ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PropertiesPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; property?: Property }>({ open: false });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertiesService.getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => propertiesService.delete(id),
    onSuccess: () => {
      toast.success('Đã xóa khu trọ');
      qc.invalidateQueries({ queryKey: ['properties'] });
      setDeleteId(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Xóa thất bại';
      toast.error(msg);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Khu trọ</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Quản lý các khu nhà trọ của bạn</p>
        </div>
        <button onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={16} /> Thêm khu trọ
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <div className="text-center py-20 text-gray-500 dark:text-gray-400">
          <Building2 size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Chưa có khu trọ nào</p>
          <p className="text-sm mt-1">Nhấn "Thêm khu trọ" để bắt đầu</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {data?.data.map((p) => (
            <div key={p.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              {p.images[0] ? (
                <img src={p.images[0]} alt={p.name} className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 flex items-center justify-center">
                  <Building2 size={40} className="text-blue-400" />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg leading-tight">{p.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500'}`}>
                    {p.isActive ? 'Hoạt động' : 'Ngừng'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-3">
                  <MapPin size={13} className="shrink-0" />
                  {[p.ward, p.district, p.province].filter(Boolean).join(', ')}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <span className="flex items-center gap-1.5"><DoorOpen size={14} />{p._count?.rooms ?? 0} phòng</span>
                </div>
                <div className="flex gap-2">
                  <Link href={`/properties/${p.id}`} className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <Eye size={14} /> Chi tiết
                  </Link>
                  <button onClick={() => setModal({ open: true, property: p })} className="p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setDeleteId(p.id)} className="p-2 border border-red-200 dark:border-red-800 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal.open && <PropertyModal property={modal.property} onClose={() => setModal({ open: false })} />}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Xác nhận xóa</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">Bạn có chắc muốn xóa khu trọ này? Hành động này không thể hoàn tác.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Hủy</button>
              <button onClick={() => deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
                {deleteMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
