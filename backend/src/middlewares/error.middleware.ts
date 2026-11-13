/**
 * middlewares/error.middleware.ts
 * Global error handler - bắt tất cả lỗi không được xử lý
 * Phải đặt CUỐI CÙNG trong chuỗi middleware của Express
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import logger from '../utils/logger';

/**
 * Middleware xử lý lỗi toàn cục
 * Express nhận diện đây là error handler nhờ có 4 tham số (err, req, res, next)
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  // Log lỗi với stack trace
  logger.error(`${req.method} ${req.path} - ${err.message}`, {
    stack: err.stack,
    body: req.body,
    params: req.params,
    query: req.query,
  });

  // ============================================================
  // Xử lý lỗi Validation từ Zod (dữ liệu đầu vào không hợp lệ)
  // ============================================================
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Dữ liệu không hợp lệ',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // ============================================================
  // Xử lý lỗi từ Prisma (database)
  // ============================================================
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        // Unique constraint violation (ví dụ: email đã tồn tại)
        res.status(409).json({
          success: false,
          message: 'Dữ liệu đã tồn tại trong hệ thống',
          error: err.meta?.target,
        });
        return;

      case 'P2025':
        // Record not found
        res.status(404).json({
          success: false,
          message: 'Không tìm thấy dữ liệu',
        });
        return;

      case 'P2003':
        // Foreign key constraint
        res.status(400).json({
          success: false,
          message: 'Dữ liệu liên quan không hợp lệ',
        });
        return;
    }
  }

  // ============================================================
  // Lỗi có status code tùy chỉnh (AppError)
  // ============================================================
  if ('statusCode' in err) {
    const statusCode = (err as { statusCode: number }).statusCode;
    res.status(statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // ============================================================
  // Lỗi không xác định - trả về 500
  // ============================================================
  res.status(500).json({
    success: false,
    message: 'Lỗi máy chủ nội bộ',
    ...(process.env.NODE_ENV !== 'production' && { error: err.message }),
  });
};

/**
 * Middleware xử lý route không tồn tại (404)
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Không tìm thấy endpoint: ${req.method} ${req.path}`,
  });
};

/**
 * Class AppError để throw lỗi có HTTP status code tùy chỉnh
 * Sử dụng trong services và controllers
 * 
 * Ví dụ: throw new AppError('Email đã tồn tại', 409)
 */
export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}
