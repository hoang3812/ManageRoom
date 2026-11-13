/**
 * middlewares/auth.middleware.ts
 * Middleware xác thực JWT token cho các route cần đăng nhập
 * Và kiểm tra phân quyền dựa trên role
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { verifyAccessToken } from '../utils/jwt';
import { sendError } from '../utils/response';
import prisma from '../config/database';

/**
 * Middleware xác thực: kiểm tra Bearer token trong Authorization header
 * Nếu hợp lệ, đính kèm thông tin user vào req.user
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Lấy token từ Authorization header (format: "Bearer <token>")
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'Vui lòng đăng nhập để tiếp tục', 401);
      return;
    }

    const token = authHeader.split(' ')[1];

    // Xác thực token
    const payload = verifyAccessToken(token);

    // Kiểm tra type phải là access token
    if (payload.type !== 'access') {
      sendError(res, 'Token không hợp lệ', 401);
      return;
    }

    // Kiểm tra user còn tồn tại và đang active trong DB
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      sendError(res, 'Tài khoản không tồn tại hoặc đã bị vô hiệu hóa', 401);
      return;
    }

    // Đính kèm thông tin user vào request để các controller sử dụng
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    next();
  } catch (error: unknown) {
    // Token hết hạn hoặc không hợp lệ
    const errMsg = error instanceof Error ? error.message : '';
    if (errMsg === 'jwt expired') {
      sendError(res, 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại', 401);
    } else {
      sendError(res, 'Token không hợp lệ', 401);
    }
  }
};

/**
 * Middleware phân quyền: kiểm tra role của user
 * Dùng sau middleware authenticate
 * @param roles - Danh sách các role được phép truy cập
 * 
 * Ví dụ: authorize('OWNER', 'STAFF') - chỉ cho OWNER và STAFF
 */
export const authorize = (...roles: string[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      sendError(res, 'Chưa xác thực', 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(
        res,
        'Bạn không có quyền thực hiện hành động này',
        403
      );
      return;
    }

    next();
  };
};
