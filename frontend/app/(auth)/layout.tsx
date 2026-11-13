'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import Image from 'next/image';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard');
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen flex">
      {/* Left: Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
      {/* Right: Branding */}
      <div className="hidden lg:flex flex-1 bg-blue-600 items-center justify-center relative overflow-hidden">
        <div className="text-center text-white z-10 px-8">
          <div className="text-6xl mb-6">🏘️</div>
          <h1 className="text-4xl font-bold mb-4">RMS</h1>
          <p className="text-xl text-blue-100 mb-4">Hệ thống Quản lý Phòng trọ</p>
          <p className="text-blue-200 max-w-sm">
            Quản lý toàn bộ hoạt động cho thuê phòng một cách tập trung, hiện đại và hiệu quả.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-6 text-center">
            {[
              { icon: '🏠', label: 'Quản lý phòng' },
              { icon: '📄', label: 'Hợp đồng' },
              { icon: '💰', label: 'Thanh toán' },
              { icon: '🔧', label: 'Bảo trì' },
              { icon: '📊', label: 'Thống kê' },
              { icon: '🤖', label: 'AI hỗ trợ' },
            ].map(({ icon, label }) => (
              <div key={label} className="bg-white/10 rounded-xl p-3">
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-xs text-blue-100">{label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-800 opacity-50" />
      </div>
    </div>
  );
}
