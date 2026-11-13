/**
 * utils/response.ts
 * Các hàm tiện ích để tạo cấu trúc response JSON chuẩn cho API
 */

import { Response } from 'express';
import { ApiResponse, PaginationMeta } from '../types';

/**
 * Trả về response thành công
 * @param res - Express Response object
 * @param data - Dữ liệu trả về
 * @param message - Thông báo
 * @param statusCode - HTTP status code (mặc định 200)
 * @param meta - Thông tin phân trang (tùy chọn)
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Thành công',
  statusCode = 200,
  meta?: PaginationMeta
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    ...(meta && { meta }),
  };
  return res.status(statusCode).json(response);
};

/**
 * Trả về response lỗi
 * @param res - Express Response object
 * @param message - Thông báo lỗi
 * @param statusCode - HTTP status code (mặc định 400)
 * @param error - Chi tiết lỗi (tùy chọn)
 */
export const sendError = (
  res: Response,
  message: string,
  statusCode = 400,
  error?: string
): Response => {
  const response: ApiResponse = {
    success: false,
    message,
    ...(error && { error }),
  };
  return res.status(statusCode).json(response);
};

/**
 * Tính toán thông tin phân trang
 * @param page - Trang hiện tại
 * @param limit - Số lượng phần tử mỗi trang
 * @param total - Tổng số phần tử
 */
export const buildPaginationMeta = (
  page: number,
  limit: number,
  total: number
): PaginationMeta => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

/**
 * Tính offset cho SQL query
 * @param page - Trang hiện tại (bắt đầu từ 1)
 * @param limit - Số lượng phần tử mỗi trang
 */
export const calculateSkip = (page: number, limit: number): number =>
  (page - 1) * limit;
