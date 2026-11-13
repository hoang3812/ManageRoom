'use client';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboard.service';
import { formatCurrency } from '@/lib/utils';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Building2, DoorOpen, Users, Receipt, TrendingUp,
  TrendingDown, Minus, Wrench, AlertTriangle,
} from 'lucide-react';

function StatCard({ title, value, subtitle, icon: Icon, color, trend }: {
  title: string; value: string | number; subtitle?: string;
  icon: React.ElementType; color: string; trend?: number;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-500' : 'text-gray-400'}`}>
              {trend > 0 ? <TrendingUp size={14} /> : trend < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
              <span>{Math.abs(trend).toFixed(1)}% so với tháng trước</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={22} className="text-white" />
        </div>
      </div>
    </div>
  );
}

const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#94a3b8'];

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardService.getOverview,
  });

  const { data: chartData } = useQuery({
    queryKey: ['dashboard-revenue-chart'],
    queryFn: () => dashboardService.getRevenueChart(),
  });

  const { data: roomStatus } = useQuery({
    queryKey: ['dashboard-room-status'],
    queryFn: dashboardService.getRoomStatus,
  });

  const { data: activities } = useQuery({
    queryKey: ['dashboard-activities'],
    queryFn: dashboardService.getRecentActivities,
  }) as { data: { recentPayments: unknown[]; recentMaintenance: unknown[]; recentContracts: unknown[] } | undefined };

  if (statsLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 h-72 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
          <div className="h-72 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        </div>
      </div>
    );
  }

  const pieData = roomStatus ? [
    { name: 'Đang thuê', value: roomStatus.occupied },
    { name: 'Trống', value: roomStatus.available },
    { name: 'Bảo trì', value: roomStatus.maintenance },
    { name: 'Ngừng HĐ', value: roomStatus.inactive },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Tổng quan hệ thống quản lý phòng trọ</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          title="Tổng số phòng"
          value={stats?.totalRooms ?? 0}
          subtitle={`${stats?.occupiedRooms ?? 0} đang thuê · ${stats?.availableRooms ?? 0} trống`}
          icon={DoorOpen}
          color="bg-blue-500"
        />
        <StatCard
          title="Tỉ lệ lấp đầy"
          value={`${stats?.occupancyRate ?? 0}%`}
          subtitle={`${stats?.totalTenants ?? 0} người thuê`}
          icon={Users}
          color="bg-green-500"
        />
        <StatCard
          title="Doanh thu tháng này"
          value={formatCurrency(stats?.currentMonthRevenue ?? 0)}
          icon={TrendingUp}
          color="bg-purple-500"
          trend={stats?.revenueGrowth}
        />
        <StatCard
          title="Hóa đơn quá hạn"
          value={stats?.overdueInvoices ?? 0}
          subtitle={`${stats?.pendingMaintenance ?? 0} bảo trì chờ xử lý`}
          icon={AlertTriangle}
          color="bg-red-500"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Revenue chart */}
        <div className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Doanh thu theo tháng</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData?.chartData ?? []}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
              <Tooltip formatter={(v) => [formatCurrency(Number(v)), 'Doanh thu']} />
              <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Room status pie */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Tình trạng phòng</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                  <span className="text-gray-600 dark:text-gray-400">{d.name}</span>
                </div>
                <span className="font-medium text-gray-900 dark:text-white">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
              <Receipt size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm text-amber-700 dark:text-amber-400">Hợp đồng sắp hết hạn</p>
              <p className="text-2xl font-bold text-amber-800 dark:text-amber-300">{stats?.expiringContracts ?? 0}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">trong 30 ngày tới</p>
            </div>
          </div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
              <AlertTriangle size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm text-red-700 dark:text-red-400">Hóa đơn quá hạn</p>
              <p className="text-2xl font-bold text-red-800 dark:text-red-300">{stats?.overdueInvoices ?? 0}</p>
              <p className="text-xs text-red-600 dark:text-red-400">cần thu tiền</p>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <Wrench size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm text-blue-700 dark:text-blue-400">Bảo trì chờ xử lý</p>
              <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">{stats?.pendingMaintenance ?? 0}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">yêu cầu</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
