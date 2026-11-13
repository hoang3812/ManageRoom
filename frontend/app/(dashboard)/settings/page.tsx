/**
 * app/(dashboard)/settings/page.tsx
 * Trang Cài đặt tài khoản: profile, đổi mật khẩu, theme
 */
'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { User, Lock, Palette, Camera, Loader2, Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from 'next-themes';

type Tab = 'profile' | 'security' | 'appearance';

interface ProfileForm {
  fullName: string;
  phone?: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const user = useAuthStore(s => s.user);
  const updateUser = useAuthStore(s => s.updateUser);
  const { theme, setTheme } = useTheme();
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Profile form
  const profileForm = useForm<ProfileForm>({
    defaultValues: {
      fullName: user?.fullName || '',
      phone: user?.phone || '',
    }
  });

  const profileMutation = useMutation({
    mutationFn: (data: ProfileForm) => api.patch('/users/profile', data),
    onSuccess: (res) => {
      updateUser(res.data.data);
      toast.success('Cập nhật thông tin thành công!');
    },
    onError: () => toast.error('Cập nhật thất bại'),
  });

  // Password form
  const passwordForm = useForm<PasswordForm>();
  const passwordMutation = useMutation({
    mutationFn: (data: PasswordForm) => api.post('/auth/change-password', {
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    }),
    onSuccess: () => {
      toast.success('Đổi mật khẩu thành công!');
      passwordForm.reset();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Đổi mật khẩu thất bại');
    },
  });

  const onPasswordSubmit = (data: PasswordForm) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }
    passwordMutation.mutate(data);
  };

  // Avatar upload
  const avatarMutation = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('avatar', file);
      return api.post('/users/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    onSuccess: (res) => {
      updateUser({ avatar: res.data.data.avatarUrl });
      toast.success('Cập nhật ảnh đại diện thành công!');
    },
    onError: () => toast.error('Upload thất bại'),
  });

  const TABS: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
    { id: 'profile', label: 'Hồ sơ', icon: User },
    { id: 'security', label: 'Bảo mật', icon: Lock },
    { id: 'appearance', label: 'Giao diện', icon: Palette },
  ];

  const roleLabel = { OWNER: 'Chủ trọ', STAFF: 'Nhân viên', TENANT: 'Người thuê' };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cài đặt</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Quản lý tài khoản và tùy chỉnh hệ thống</p>
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}>
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-6 shadow-sm">
          {/* Avatar */}
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center overflow-hidden">
                {user?.avatar
                  ? <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
                  : <span className="text-2xl font-bold text-blue-600">{user?.fullName?.[0]?.toUpperCase()}</span>
                }
              </div>
              <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors">
                {avatarMutation.isPending ? <Loader2 size={14} className="text-white animate-spin" /> : <Camera size={14} className="text-white" />}
                <input type="file" className="hidden" accept="image/*" onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) avatarMutation.mutate(file);
                }} />
              </label>
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{user?.fullName}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
              <span className="inline-block mt-1 px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-full">
                {roleLabel[user?.role || 'TENANT']}
              </span>
            </div>
          </div>

          <hr className="border-gray-100 dark:border-gray-700" />

          <form onSubmit={profileForm.handleSubmit(d => profileMutation.mutate(d))} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Họ tên đầy đủ</label>
              <input {...profileForm.register('fullName', { required: true })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Số điện thoại</label>
              <input {...profileForm.register('phone')}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input value={user?.email} disabled
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed" />
              <p className="text-xs text-gray-400 mt-1">Email không thể thay đổi</p>
            </div>
            <button type="submit" disabled={profileMutation.isPending}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {profileMutation.isPending && <Loader2 size={16} className="animate-spin" />}
              Lưu thay đổi
            </button>
          </form>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-5">Đổi mật khẩu</h2>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            {[
              { name: 'currentPassword' as const, label: 'Mật khẩu hiện tại', show: showCurrentPass, toggle: () => setShowCurrentPass(!showCurrentPass) },
              { name: 'newPassword' as const, label: 'Mật khẩu mới', show: showNewPass, toggle: () => setShowNewPass(!showNewPass) },
              { name: 'confirmPassword' as const, label: 'Xác nhận mật khẩu mới', show: showNewPass, toggle: () => {} },
            ].map(({ name, label, show, toggle }) => (
              <div key={name}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    {...passwordForm.register(name, { required: true, minLength: name !== 'currentPassword' ? { value: 6, message: 'Tối thiểu 6 ký tự' } : undefined })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none pr-10"
                  />
                  {name !== 'confirmPassword' && (
                    <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  )}
                </div>
                {passwordForm.formState.errors[name] && (
                  <p className="text-xs text-red-500 mt-1">{passwordForm.formState.errors[name]?.message || 'Bắt buộc'}</p>
                )}
              </div>
            ))}

            <button type="submit" disabled={passwordMutation.isPending}
              className="w-full py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {passwordMutation.isPending && <Loader2 size={16} className="animate-spin" />}
              Đổi mật khẩu
            </button>
          </form>
        </div>
      )}

      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-5">Giao diện</h2>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Chọn theme hiển thị</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'light', label: '☀️ Sáng', desc: 'Nền trắng' },
                { id: 'dark', label: '🌙 Tối', desc: 'Nền đen' },
                { id: 'system', label: '💻 Hệ thống', desc: 'Theo thiết bị' },
              ].map(t => (
                <button key={t.id} onClick={() => setTheme(t.id)}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    theme === t.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}>
                  <p className="text-xl mb-1">{t.label.split(' ')[0]}</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{t.label.split(' ')[1]}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
