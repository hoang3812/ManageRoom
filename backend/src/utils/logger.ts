/**
 * utils/logger.ts
 * Cấu hình Winston logger để ghi log có cấu trúc
 * - Console: hiển thị màu sắc khi development
 * - File: lưu error.log và combined.log khi production
 */

import winston from 'winston';
import { env } from '../config/env';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

// Format cho console output (dễ đọc khi dev)
const consoleFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }) // Ghi kèm stack trace cho error
  ),
  transports: [
    // Console transport: hiển thị màu khi development
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'HH:mm:ss' }),
        consoleFormat
      ),
    }),
    // File transport: chỉ lưu error logs
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: json(),
    }),
    // File transport: lưu tất cả logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: json(),
    }),
  ],
});

export default logger;
