/**
 * utils/jwt.ts
 * Các hàm tiện ích để tạo và xác thực JWT token
 * Sử dụng access token (ngắn hạn) và refresh token (dài hạn)
 */

import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload } from '../types';
import { UserRole } from '@prisma/client';

/**
 * Tạo access token (thời hạn ngắn, mặc định 15 phút)
 * Access token chứa thông tin user để xác thực các request
 */
export const generateAccessToken = (payload: {
  id: string;
  email: string;
  role: UserRole;
}): string => {
  return jwt.sign(
    {
      sub: payload.id,
      email: payload.email,
      role: payload.role,
      type: 'access',
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
  );
};

/**
 * Tạo refresh token (thời hạn dài, mặc định 7 ngày)
 * Refresh token dùng để lấy access token mới khi hết hạn
 */
export const generateRefreshToken = (payload: {
  id: string;
  email: string;
  role: UserRole;
}): string => {
  return jwt.sign(
    {
      sub: payload.id,
      email: payload.email,
      role: payload.role,
      type: 'refresh',
    },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions
  );
};

/**
 * Xác thực access token
 * Trả về payload nếu hợp lệ, throw error nếu không hợp lệ
 */
export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
};

/**
 * Xác thực refresh token
 */
export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
};

/**
 * Giải mã token mà không xác thực chữ ký
 * Dùng để đọc payload khi token đã hết hạn
 */
export const decodeToken = (token: string): JwtPayload | null => {
  return jwt.decode(token) as JwtPayload | null;
};
