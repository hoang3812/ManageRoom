/**
 * app/(dashboard)/utilities/page.tsx
 * Trang quản lý chỉ số điện nước
 * Cho phép OWNER/STAFF nhập chỉ số hàng tháng và xem lịch sử
 */
'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Zap, Droplets, Plus, Search, CalendarDays, Calculator } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

// ============================================================
// Form nhập chỉ số điện nước
// ============================================================
interface UtilityForm {
  roomId: string;
  month: number;
  year: number;
  electricPrev: number;
  electricCurr: number;
  electricRate: number;
  waterPrev: number;
  waterCurr: number;
  waterRate: number;
}

function UtilityReadingForm({ rooms, onSuccess }: {
  rooms: Array<{ id: string; roomNumber: string }>;
  onSuccess: () => void;
}) {
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<UtilityForm>({
    defaultValues: {
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      electricRate: 3500,
      waterRate: 15000,
      electricPrev: 0,
      electricCurr: 0,
      waterPrev: 0,
      waterCurr: 0,
    }
  });

  const watched = watch();
  const electricUsage = Math.max(0, (watched.electricCurr || 0) - (watched.electricPrev || 0));
  const waterUsage = Math.max(0, (watched.waterCurr || 0) - (watched.waterPrev || 0));
  const electricAmount = electricUsage * (watched.electricRate || 0);
  const waterAmount = waterUsage * (watched.waterRate || 0);

  const mutation = useMutation({
    mutationFn: (data: UtilityForm) => api.post('/utilities/readings', data),
    onSuccess: () => {
      toast.success('Nhập chỉ số điện nước thành công!');
      reset();
      onSuccess();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Có lỗi xảy ra');
    }
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
      {/* Room & Period */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phòng *</label>
          <select {...register('roomId', { required: true })}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">-- Chọn phòng --</option>
            {rooms.map(r => <option key={r.id} value={r.id}>Phòng {r.roomNumber}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tháng *</label>
          <select {...register('month', { required: true, valueAsNumber: true })}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m =>
              <option key={m} value={m}>Tháng {m}</option>
            )}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Năm *</label>
          <input type="number" {...register('year', { required: true, valueAsNumber: true })}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      {/* Electricity */}
      <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-700/50 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={18} className="text-yellow-600" />
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-400">Chỉ số điện</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Chỉ số cũ (kWh)</label>
            <input type="number" step="0.1" {...register('electricPrev', { valueAsNumber: true, min: 0 })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yellow-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Chỉ số mới (kWh)</label>
            <input type="number" step="0.1" {...register('electricCurr', { valueAsNumber: true, min: 0 })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yellow-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Đơn giá (đ/kWh)</label>
            <input type="number" {...register('electricRate', { valueAsNumber: true, min: 0 })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yellow-500 outline-none" />
          </div>
        </div>
        <div className="mt-3 text-sm text-yellow-700 dark:text-yellow-400 font-medium">
          Tiêu thụ: {electricUsage.toFixed(1)} kWh → Thành tiền: {formatCurrency(electricAmount)}
        </div>
      </div>

      {/* Water */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-700/50 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Droplets size={18} className="text-blue-600" />
          <h3 className="font-semibold text-blue-800 dark:text-blue-400">Chỉ số nước</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Chỉ số cũ (m³)</label>
            <input type="number" step="0.01" {...register('waterPrev', { valueAsNumber: true, min: 0 })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Chỉ số mới (m³)</label>
            <input type="number" step="0.01" {...register('waterCurr', { valueAsNumber: true, min: 0 })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Đơn giá (đ/m³)</label>
            <input type="number" {...register('waterRate', { valueAsNumber: true, min: 0 })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>
        <div className="mt-3 text-sm text-blue-700 dark:text-blue-400 font-medium">
          Tiêu thụ: {waterUsage.toFixed(2)} m³ → Thành tiền: {formatCurrency(waterAmount)}
        </div>
      </div>

      {/* Total */}
      <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <Calculator size={18} />
          <span className="font-medium">Tổng tiền điện nước:</span>
        </div>
        <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
          {formatCurrency(electricAmount + waterAmount)}
        </span>
      </div>

      <button type="submit" disabled={mutation.isPending}
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
        {mutation.isPending ? 'Đang lưu...' : 'Lưu chỉ số'}
      </button>
    </form>
  );
}

// ============================================================
// Main Page Component
// ============================================================
export default function UtilitiesPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const queryClient = useQueryClient();

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: () => api.get('/properties').then(r => r.data.data),
  });

  const { data: roomsData } = useQuery({
    queryKey: ['rooms', selectedPropertyId],
    queryFn: () => api.get(`/properties/${selectedPropertyId}/rooms?limit=100`).then(r => r.data.data),
    enabled: !!selectedPropertyId,
  });

  const rooms = roomsData?.rooms || [];

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const { data: readingsData } = useQuery({
    queryKey: ['utility-readings', selectedPropertyId, currentMonth, currentYear],
    queryFn: () => api.get(`/utilities/properties/${selectedPropertyId}/readings/month?month=${currentMonth}&year=${currentYear}`).then(r => r.data.data),
    enabled: !!selectedPropertyId,
  });

  const readings: Array<{
    room: { roomNumber: string };
    electricPrev: number;
    electricCurr: number;
    electricRate: number;
    electricUsage: number;
    electricAmount: number;
    waterPrev: number;
    waterCurr: number;
    waterRate: number;
    waterUsage: number;
    waterAmount: number;
    month: number;
    year: number;
  }> = readingsData || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Điện / Nước</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Quản lý chỉ số điện nước hàng tháng</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
          <Plus size={18} />
          Nhập chỉ số
        </button>
      </div>

      {/* Form nhập chỉ số */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Nhập chỉ số điện nước</h2>
          <UtilityReadingForm
            rooms={rooms}
            onSuccess={() => {
              setShowForm(false);
              queryClient.invalidateQueries({ queryKey: ['utility-readings'] });
            }}
          />
        </div>
      )}

      {/* Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              Tháng {currentMonth}/{currentYear}
            </span>
          </div>
          <select value={selectedPropertyId} onChange={e => setSelectedPropertyId(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">-- Chọn khu trọ --</option>
            {(properties as Array<{ id: string; name: string }> | undefined)?.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Readings Table */}
      {selectedPropertyId && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Chỉ số tháng {currentMonth}/{currentYear}
            </h2>
          </div>

          {readings.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Zap size={48} className="mx-auto mb-3 opacity-30" />
              <p>Chưa có dữ liệu tháng này</p>
              <p className="text-sm mt-1">Nhấn &quot;Nhập chỉ số&quot; để bắt đầu</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Phòng</th>
                    <th className="text-center px-4 py-3 text-yellow-600 font-medium">Điện cũ</th>
                    <th className="text-center px-4 py-3 text-yellow-600 font-medium">Điện mới</th>
                    <th className="text-center px-4 py-3 text-yellow-600 font-medium">Tiêu thụ</th>
                    <th className="text-center px-4 py-3 text-yellow-600 font-medium">Tiền điện</th>
                    <th className="text-center px-4 py-3 text-blue-600 font-medium">Nước cũ</th>
                    <th className="text-center px-4 py-3 text-blue-600 font-medium">Nước mới</th>
                    <th className="text-center px-4 py-3 text-blue-600 font-medium">Tiêu thụ</th>
                    <th className="text-center px-4 py-3 text-blue-600 font-medium">Tiền nước</th>
                    <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Tổng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {readings.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        Phòng {r.room?.roomNumber}
                      </td>
                      <td className="text-center px-4 py-3 text-gray-600 dark:text-gray-400">{r.electricPrev}</td>
                      <td className="text-center px-4 py-3 text-gray-600 dark:text-gray-400">{r.electricCurr}</td>
                      <td className="text-center px-4 py-3 text-yellow-600 font-medium">{r.electricUsage} kWh</td>
                      <td className="text-center px-4 py-3 text-yellow-700 dark:text-yellow-400 font-medium">
                        {formatCurrency(r.electricAmount)}
                      </td>
                      <td className="text-center px-4 py-3 text-gray-600 dark:text-gray-400">{r.waterPrev}</td>
                      <td className="text-center px-4 py-3 text-gray-600 dark:text-gray-400">{r.waterCurr}</td>
                      <td className="text-center px-4 py-3 text-blue-600 font-medium">{r.waterUsage?.toFixed(2)} m³</td>
                      <td className="text-center px-4 py-3 text-blue-700 dark:text-blue-400 font-medium">
                        {formatCurrency(r.waterAmount)}
                      </td>
                      <td className="text-right px-4 py-3 font-bold text-gray-900 dark:text-white">
                        {formatCurrency((r.electricAmount || 0) + (r.waterAmount || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-900/50 font-bold">
                  <tr>
                    <td className="px-4 py-3 text-gray-900 dark:text-white" colSpan={4}>Tổng cộng</td>
                    <td className="text-center px-4 py-3 text-yellow-700 dark:text-yellow-400">
                      {formatCurrency(readings.reduce((s, r) => s + (r.electricAmount || 0), 0))}
                    </td>
                    <td colSpan={3}></td>
                    <td className="text-center px-4 py-3 text-blue-700 dark:text-blue-400">
                      {formatCurrency(readings.reduce((s, r) => s + (r.waterAmount || 0), 0))}
                    </td>
                    <td className="text-right px-4 py-3 text-gray-900 dark:text-white">
                      {formatCurrency(readings.reduce((s, r) => s + (r.electricAmount || 0) + (r.waterAmount || 0), 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {!selectedPropertyId && (
        <div className="text-center py-16 text-gray-400">
          <Droplets size={64} className="mx-auto mb-4 opacity-20" />
          <p className="text-lg">Chọn khu trọ để xem chỉ số điện nước</p>
        </div>
      )}
    </div>
  );
}
