'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomsService } from '@/services/rooms.service';
import { propertiesService } from '@/services/properties.service';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, DoorOpen, X, Loader2, Search, Filter } from 'lucide-react';
import { Room, RoomStatus } from '@/types';
import { formatCurrency, getRoomStatusLabel } from '@/lib/utils';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  OCCUPIED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  MAINTENANCE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  INACTIVE: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

const schema = z.object({
  roomNumber: z.string().min(1, 'Số phòng không được để trống'),
  floor: z.string().optional().transform(v => v ? parseInt(v) : undefined),
  area: z.string().optional().transform(v => v ? parseFloat(v) : undefined),
  maxOccupants: z.string().default('2').transform(v => parseInt(v)),
  basePrice: z.string().min(1, 'Giá phòng không được để trống').transform(v => parseFloat(v)),
  deposit: z.string().default('0').transform(v => parseFloat(v)),
  propertyId: z.string().min(1, 'Vui lòng chọn khu trọ'),
  description: z.string().optional(),
});
type FormInput = z.input<typeof schema>;
type FormData = z.infer<typeof schema>;

function RoomModal({ room, onClose }: { room?: Room; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: properties } = useQuery({ queryKey: ['properties-simple'], queryFn: () => propertiesService.getAll() });

  const { register, handleSubmit, formState: { errors } } = useForm<FormInput>({
    resolver: zodResolver(schema) as any,
    defaultValues: room ? {
      roomNumber: room.roomNumber,
      floor: room.floor?.toString(),
      area: room.area?.toString(),
      maxOccupants: room.maxOccupants.toString(),
      basePrice: room.basePrice.toString(),
      deposit: room.deposit.toString(),
      propertyId: room.propertyId,
      description: room.description,
    } : {},
  });

  const mutation = useMutation({
    mutationFn: (data: FormInput) =>
      room ? roomsService.update(room.id, data as Record<string, unknown>) : roomsService.create(data as Record<string, unknown>),
    onSuccess: () => {
      toast.success(room ? 'Cập nhật phòng thành công' : 'Tạo phòng thành công');
      qc.invalidateQueries({ queryKey: ['rooms'] });
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
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{room ? 'Chỉnh sửa phòng' : 'Thêm phòng mới'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Khu trọ *</label>
            <select {...register('propertyId')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">-- Chọn khu trọ --</option>
              {properties?.data.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {errors.propertyId && <p className="text-xs text-red-500 mt-1">{errors.propertyId.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Số phòng *</label>
              <input {...register('roomNumber')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="P.101" />
              {errors.roomNumber && <p className="text-xs text-red-500 mt-1">{errors.roomNumber.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tầng</label>
              <input {...register('floor')} type="number" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="1" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Diện tích (m²)</label>
              <input {...register('area')} type="number" step="0.1" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="25" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Số người tối đa</label>
              <input {...register('maxOccupants')} type="number" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tiền cọc (đ)</label>
              <input {...register('deposit')} type="number" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="3000000" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Giá thuê (đ/tháng) *</label>
            <input {...register('basePrice')} type="number" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="3500000" />
            {errors.basePrice && <p className="text-xs text-red-500 mt-1">{errors.basePrice.message}</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium">Hủy</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
              {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
              {room ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RoomsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; room?: Room }>({ open: false });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['rooms', search, statusFilter, page],
    queryFn: () => roomsService.getAll({ search: search || undefined, status: statusFilter || undefined, page, limit: 12 }),
  });

  const deleteMutation = useMutation({
    mutationFn: roomsService.delete,
    onSuccess: () => { toast.success('Đã xóa phòng'); qc.invalidateQueries({ queryKey: ['rooms'] }); },
    onError: (err: unknown) => { toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Xóa thất bại'); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Phòng</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Quản lý tất cả phòng trọ</p>
        </div>
        <button onClick={() => setModal({ open: true })} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={16} /> Thêm phòng
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Tìm theo số phòng..." />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
          <option value="">Tất cả trạng thái</option>
          <option value="AVAILABLE">Trống</option>
          <option value="OCCUPIED">Đang thuê</option>
          <option value="MAINTENANCE">Bảo trì</option>
          <option value="INACTIVE">Ngừng HĐ</option>
        </select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data?.data.map(room => (
              <div key={room.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <DoorOpen size={16} className="text-blue-500" />
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg">Phòng {room.roomNumber}</h3>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{room.property?.name}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[room.status]}`}>
                    {getRoomStatusLabel(room.status)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Giá thuê</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(room.basePrice)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Tiền cọc</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(room.deposit)}</p>
                  </div>
                  {room.area && <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Diện tích</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{room.area} m²</p>
                  </div>}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Tối đa</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{room.maxOccupants} người</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/rooms/${room.id}`} className="flex-1 py-2 text-center border border-gray-200 dark:border-gray-600 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    Chi tiết
                  </Link>
                  <button onClick={() => setModal({ open: true, room })} className="p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => { if (confirm('Xóa phòng này?')) deleteMutation.mutate(room.id); }}
                    className="p-2 border border-red-200 dark:border-red-800 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {data?.meta && data.meta.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">Tổng {data.meta.total} phòng</p>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-40">← Trước</button>
                <span className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400">Trang {page}/{data.meta.totalPages}</span>
                <button disabled={page === data.meta.totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-40">Sau →</button>
              </div>
            </div>
          )}
        </>
      )}

      {modal.open && <RoomModal room={modal.room} onClose={() => setModal({ open: false })} />}
    </div>
  );
}
