'use client';
import { useRouter } from 'next/navigation';
import { Bell, LogOut, User, Settings, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/store/auth.store';
import { getInitials, getRoleLabel } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/lib/api';

export default function Header() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const [open, setOpen] = require('react').useState(false);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    logout();
    toast.success('Đã đăng xuất');
    router.push('/login');
  };

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold text-gray-800 dark:text-white">
          Hệ thống Quản lý Phòng trọ
        </h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Dark mode toggle */}
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <button onClick={() => router.push('/notifications')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button onClick={() => setOpen(!open)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {user ? getInitials(user.fullName) : 'U'}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-sm font-medium text-gray-900 dark:text-white leading-none">{user?.fullName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user ? getRoleLabel(user.role) : ''}</p>
            </div>
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 z-50">
              <button onClick={() => { router.push('/settings'); setOpen(false); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                <User size={16} /> Hồ sơ cá nhân
              </button>
              <button onClick={() => { router.push('/settings'); setOpen(false); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                <Settings size={16} /> Cài đặt
              </button>
              <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
              <button onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                <LogOut size={16} /> Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
