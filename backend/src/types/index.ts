/**
 * types/index.ts
 * Định nghĩa các TypeScript types và interfaces dùng chung trong toàn bộ ứng dụng
 */

import { Request } from 'express';
import { UserRole } from '@prisma/client';

// ============================================================
// Mở rộng Express Request để chứa thông tin người dùng đã xác thực
// ============================================================
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    fullName: string;
  };
}

// ============================================================
// Cấu trúc response chuẩn trả về từ API
// ============================================================
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: PaginationMeta;
  error?: string;
}

// ============================================================
// Thông tin phân trang
// ============================================================
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ============================================================
// Tham số phân trang từ query string
// ============================================================
export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================
// Payload của JWT token
// ============================================================
export interface JwtPayload {
  sub: string;       // user id
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

// ============================================================
// Thông tin upload file
// ============================================================
export interface UploadedFile {
  url: string;
  publicId: string;
  format: string;
  size: number;
}
