import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd/MM/yyyy', { locale: vi });
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: vi });
}

export function formatMonthYear(month: number, year: number): string {
  return `Tháng ${month}/${year}`;
}

export function getRoomStatusLabel(status: string): string {
  const map: Record<string, string> = {
    AVAILABLE: 'Trống',
    OCCUPIED: 'Đang thuê',
    MAINTENANCE: 'Bảo trì',
    INACTIVE: 'Ngừng hoạt động',
  };
  return map[status] || status;
}

export function getContractStatusLabel(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'Đang hiệu lực',
    EXPIRED: 'Đã hết hạn',
    TERMINATED: 'Đã chấm dứt',
    PENDING: 'Chờ xác nhận',
  };
  return map[status] || status;
}

export function getInvoiceStatusLabel(status: string): string {
  const map: Record<string, string> = {
    DRAFT: 'Nháp',
    SENT: 'Đã gửi',
    PAID: 'Đã thanh toán',
    OVERDUE: 'Quá hạn',
    CANCELLED: 'Đã hủy',
  };
  return map[status] || status;
}

export function getPaymentMethodLabel(method: string): string {
  const map: Record<string, string> = {
    CASH: 'Tiền mặt',
    VNPAY: 'VNPay',
    BANK_TRANSFER: 'Chuyển khoản',
  };
  return map[method] || method;
}

export function getMaintenanceStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'Chờ xử lý',
    IN_PROGRESS: 'Đang xử lý',
    COMPLETED: 'Hoàn thành',
    REJECTED: 'Từ chối',
  };
  return map[status] || status;
}

export function getMaintenancePriorityLabel(priority: string): string {
  const map: Record<string, string> = {
    LOW: 'Thấp',
    MEDIUM: 'Trung bình',
    HIGH: 'Cao',
    URGENT: 'Khẩn cấp',
  };
  return map[priority] || priority;
}

export function getRoleLabel(role: string): string {
  const map: Record<string, string> = {
    OWNER: 'Chủ trọ',
    STAFF: 'Nhân viên',
    TENANT: 'Người thuê',
  };
  return map[role] || role;
}

export function truncate(str: string, length = 50): string {
  return str.length > length ? str.slice(0, length) + '...' : str;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(-2)
    .join('')
    .toUpperCase();
}
