'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '@/services/notifications.service';
import { formatDateTime } from '@/lib/utils';
import { Bell, CheckCheck, Trash2, Receipt, FileText, CreditCard, Wrench, Megaphone, Info } from 'lucide-react';
import { Notification } from '@/types';
import { toast } from 'sonner';

const TYPE_ICONS: Record<string, React.ElementType> = {
  INVOICE: Receipt,
  CONTRACT: FileText,
  PAYMENT: CreditCard,
  MAINTENANCE: Wrench,
  ANNOUNCEMENT: Megaphone,
  SYSTEM: Info,
};

const TYPE_COLORS: Record<string, string> = {
  INVOICE: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  CONTRACT: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  PAYMENT: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  MAINTENANCE: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  ANNOUNCEMENT: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  SYSTEM: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

export default function NotificationsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsService.getAll({ limit: 50 }),
  });

  const markAllMutation = useMutation({
    mutationFn: notificationsService.markAllAsRead,
    onSuccess: () => { toast.success('Đã đánh dấu tất cả là đã đọc'); qc.invalidateQueries({ queryKey: ['notifications'] }); },
  });

  const markReadMutation = useMutation({
    mutationFn: notificationsService.markAsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: notificationsService.delete,
    onSuccess: () => { toast.success('Đã xóa thông báo'); qc.invalidateQueries({ queryKey: ['notifications'] }); },
  });

  const notifications: Notification[] = (data as { data: Notification[] } | undefined)?.data ?? [];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Thông báo</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Không có thông báo mới'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <CheckCheck size={15} /> Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <Bell size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Bạn chưa có thông báo nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const Icon = TYPE_ICONS[n.type] || Info;
            const colorClass = TYPE_COLORS[n.type] || TYPE_COLORS.SYSTEM;
            return (
              <div key={n.id}
                onClick={() => !n.isRead && markReadMutation.mutate(n.id)}
                className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer group ${
                  n.isRead
                    ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                    : 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800 shadow-sm'
                }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm font-semibold ${n.isRead ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>
                        {n.title}
                        {!n.isRead && <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full inline-block" />}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{n.body}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs text-gray-400 whitespace-nowrap">{formatDateTime(n.createdAt)}</span>
                      <button onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(n.id); }}
                        className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
