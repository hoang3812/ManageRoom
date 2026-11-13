'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { maintenanceService } from '@/services/maintenance.service';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, X, Loader2, Search, Wrench } from 'lucide-react';
import { MaintenanceRequest } from '@/types';
import { formatDate, getMaintenanceStatusLabel, getMaintenancePriorityLabel } from '@/lib/utils';
import { roomsService } from '@/services/rooms.service';

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  HIGH: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  URGENT: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

const schema = z.object({
  roomId: z.string().min(1, 'Vui lòng chọn phòng'),
  title: z.string().min(5, 'Tiêu đề tối thiểu 5 ký tự'),
  description: z.string().min(10, 'Mô tả tối thiểu 10 ký tự'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
});
type FormData = z.infer<typeof schema>;
type FormInput = z.input<typeof schema>;

function MaintenanceModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: rooms } = useQuery({ queryKey: ['rooms-occupied'], queryFn: () => roomsService.getAll({ status: 'OCCUPIED', limit: 100 }) });
  const { register, handleSubmit, formState: { errors } } = useForm<FormInput>({ resolver: zodResolver(schema) as any });

  const mutation = useMutation({
    mutationFn: (data: FormInput) => {
      const form = new FormData();
      Object.entries(data).forEach(([k, v]) => form.append(k, v));
      return maintenanceService.create(form);
    },
    onSuccess: () => { toast.success('Gửi yêu cầu bảo trì thành công'); qc.invalidateQueries({ queryKey: ['maintenance'] }); onClose(); },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Thao tác thất bại'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Tạo yêu cầu bảo trì</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phòng *</label>
            <select {...register('roomId')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">-- Chọn phòng --</option>
              {rooms?.data.map(r => <option key={r.id} value={r.id}>Phòng {r.roomNumber} – {r.property?.name}</option>)}
            </select>
            {errors.roomId && <p className="text-xs text-red-500 mt-1">{errors.roomId.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tiêu đề *</label>
            <input {...register('title')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Máy lạnh bị hỏng..." />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mô tả chi tiết *</label>
            <textarea {...register('description')} rows={4} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Mô tả chi tiết sự cố..." />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mức độ ưu tiên</label>
            <select {...register('priority')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="LOW">Thấp</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="HIGH">Cao</option>
              <option value="URGENT">Khẩn cấp</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium">Hủy</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
              {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Gửi yêu cầu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MaintenancePage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['maintenance', statusFilter, priorityFilter, page],
    queryFn: () => maintenanceService.getAll({ status: statusFilter || undefined, priority: priorityFilter || undefined, page, limit: 15 }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => maintenanceService.update(id, { status }),
    onSuccess: () => { toast.success('Cập nhật trạng thái thành công'); qc.invalidateQueries({ queryKey: ['maintenance'] }); },
    onError: () => toast.error('Cập nhật thất bại'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bảo trì</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Quản lý yêu cầu sửa chữa và bảo dưỡng</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={16} /> Tạo yêu cầu
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
          <option value="">Tất cả trạng thái</option>
          <option value="PENDING">Chờ xử lý</option>
          <option value="IN_PROGRESS">Đang xử lý</option>
          <option value="COMPLETED">Hoàn thành</option>
          <option value="REJECTED">Từ chối</option>
        </select>
        <select value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
          <option value="">Tất cả mức độ</option>
          <option value="URGENT">Khẩn cấp</option>
          <option value="HIGH">Cao</option>
          <option value="MEDIUM">Trung bình</option>
          <option value="LOW">Thấp</option>
        </select>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />)
        ) : data?.data.length === 0 ? (
          <div className="text-center py-20">
            <Wrench size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 dark:text-gray-400">Không có yêu cầu bảo trì nào</p>
          </div>
        ) : data?.data.map(req => (
          <div key={req.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[req.priority]}`}>{getMaintenancePriorityLabel(req.priority)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[req.status]}`}>{getMaintenanceStatusLabel(req.status)}</span>
                  <span className="text-xs text-gray-400 font-mono">{req.requestCode}</span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{req.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{req.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>Phòng {req.room?.roomNumber}</span>
                  <span>{formatDate(req.createdAt)}</span>
                  {req.requester && <span>Báo cáo bởi: {req.requester.fullName}</span>}
                </div>
              </div>
              {(req.status === 'PENDING' || req.status === 'IN_PROGRESS') && (
                <div className="flex gap-2 shrink-0">
                  {req.status === 'PENDING' && (
                    <button onClick={() => updateMutation.mutate({ id: req.id, status: 'IN_PROGRESS' })}
                      className="px-3 py-1.5 text-xs border border-blue-200 text-blue-700 dark:border-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20">
                      Tiếp nhận
                    </button>
                  )}
                  {req.status === 'IN_PROGRESS' && (
                    <button onClick={() => updateMutation.mutate({ id: req.id, status: 'COMPLETED' })}
                      className="px-3 py-1.5 text-xs border border-green-200 text-green-700 dark:border-green-700 dark:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20">
                      Hoàn thành
                    </button>
                  )}
                  <button onClick={() => updateMutation.mutate({ id: req.id, status: 'REJECTED' })}
                    className="px-3 py-1.5 text-xs border border-red-200 text-red-600 dark:border-red-700 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                    Từ chối
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && <MaintenanceModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
