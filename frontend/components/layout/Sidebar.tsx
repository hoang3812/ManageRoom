'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Building2, DoorOpen, Users, FileText,
  Zap, Receipt, CreditCard, Wrench, BarChart3,
  MessageCircle, Bot, Settings, ChevronRight,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/properties', label: 'Khu trọ', icon: Building2 },
  { href: '/rooms', label: 'Phòng', icon: DoorOpen },
  { href: '/tenants', label: 'Người thuê', icon: Users },
  { href: '/contracts', label: 'Hợp đồng', icon: FileText },
  { href: '/utilities', label: 'Điện / Nước', icon: Zap },
  { href: '/invoices', label: 'Hóa đơn', icon: Receipt },
  { href: '/payments', label: 'Thanh toán', icon: CreditCard },
  { href: '/maintenance', label: 'Bảo trì', icon: Wrench },
  { href: '/reports', label: 'Báo cáo', icon: BarChart3 },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/ai-assistant', label: 'AI Assistant', icon: Bot },
  { href: '/settings', label: 'Cài đặt', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0 h-full">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">R</div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white leading-none">RMS</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Quản lý phòng trọ</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link key={href} href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                  active
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
                )}>
                <Icon size={18} className={cn(active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300')} />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight size={14} className="text-blue-500" />}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-400 text-center">RMS v1.0.0 © 2026</p>
      </div>
    </aside>
  );
}
