'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsService } from '@/services/reports.service';
import { formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download, BarChart3 } from 'lucide-react';

export default function ReportsPage() {
  const currentYear = new Date().getFullYear();
  const [fromMonth, setFromMonth] = useState(1);
  const [fromYear, setFromYear] = useState(currentYear);
  const [toMonth, setToMonth] = useState(new Date().getMonth() + 1);
  const [toYear, setToYear] = useState(currentYear);

  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['report-revenue', fromMonth, fromYear, toMonth, toYear],
    queryFn: () => reportsService.getRevenue({ fromMonth, fromYear, toMonth, toYear }),
  }) as { data: { totalRevenue: number; totalTransactions: number; byMonth: { month: string; revenue: number; count: number }[]; byProperty: { propertyName: string; revenue: number }[] } | undefined; isLoading: boolean };

  const { data: debtData } = useQuery({
    queryKey: ['report-debt'],
    queryFn: reportsService.getDebt,
  }) as { data: { totalDebt: number; count: number } | undefined };

  const { data: occupancyData } = useQuery({
    queryKey: ['report-occupancy'],
    queryFn: reportsService.getOccupancy,
  }) as { data: Array<{ propertyName: string; summary: { total: number; occupied: number; available: number } }> | undefined };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Báo cáo</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Thống kê và báo cáo doanh thu, tình trạng phòng</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Tổng doanh thu (lọc)</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(revenueData?.totalRevenue ?? 0)}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{revenueData?.totalTransactions ?? 0} giao dịch</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Tổng công nợ</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{formatCurrency(debtData?.totalDebt ?? 0)}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{debtData?.count ?? 0} hóa đơn chưa thu</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Tổng khu trọ báo cáo</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{occupancyData?.length ?? 0}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">khu trọ đang hoạt động</p>
        </div>
      </div>

      {/* Revenue filter */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">Báo cáo doanh thu</h3>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400">Từ:</span>
              <select value={fromMonth} onChange={e => setFromMonth(parseInt(e.target.value))} className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm focus:outline-none">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>T{m}</option>)}
              </select>
              <select value={fromYear} onChange={e => setFromYear(parseInt(e.target.value))} className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm focus:outline-none">
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400">Đến:</span>
              <select value={toMonth} onChange={e => setToMonth(parseInt(e.target.value))} className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm focus:outline-none">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>T{m}</option>)}
              </select>
              <select value={toYear} onChange={e => setToYear(parseInt(e.target.value))} className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm focus:outline-none">
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button onClick={() => reportsService.exportRevenueExcel({ fromMonth, fromYear, toMonth, toYear })}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <Download size={14} /> Export Excel
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={revenueData?.byMonth ?? []}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(v / 1e6).toFixed(0)}M`} />
            <Tooltip formatter={(v) => [formatCurrency(Number(v)), 'Doanh thu']} />
            <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Doanh thu" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* By property */}
      {revenueData?.byProperty && revenueData.byProperty.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Doanh thu theo khu trọ</h3>
          <div className="space-y-3">
            {revenueData.byProperty.map(p => (
              <div key={p.propertyName} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{p.propertyName}</span>
                <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(p.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Occupancy by property */}
      {occupancyData && occupancyData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Tình trạng phòng theo khu trọ</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {occupancyData.map(p => (
              <div key={p.propertyName} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-3">{p.propertyName}</h4>
                <div className="flex gap-3 text-sm">
                  <div className="text-center">
                    <p className="text-xl font-bold text-blue-600">{p.summary.total}</p>
                    <p className="text-xs text-gray-500">Tổng</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-green-600">{p.summary.occupied}</p>
                    <p className="text-xs text-gray-500">Đang thuê</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-500">{p.summary.available}</p>
                    <p className="text-xs text-gray-500">Trống</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Tỉ lệ lấp đầy</p>
                    <div className="bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${p.summary.total > 0 ? (p.summary.occupied / p.summary.total) * 100 : 0}%` }} />
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 text-right">
                      {p.summary.total > 0 ? Math.round((p.summary.occupied / p.summary.total) * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Debt */}
      <div className="flex justify-end">
        <button onClick={reportsService.exportDebtExcel}
          className="flex items-center gap-1.5 px-4 py-2.5 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          <Download size={14} /> Xuất báo cáo công nợ
        </button>
      </div>
    </div>
  );
}
