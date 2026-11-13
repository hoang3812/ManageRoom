/**
 * middlewares/validate.middleware.ts
 * Middleware validation sử dụng Zod schema
 * Kiểm tra và sanitize dữ liệu đầu vào từ request body, params, query
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

/**
 * Tạo middleware validation từ Zod schema
 * @param schema - Zod schema để validate
 * @param source - Nguồn dữ liệu: 'body' | 'query' | 'params'
 * 
 * Ví dụ: router.post('/login', validate(loginSchema), authController.login)
 */
export const validate =
  (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    // Parse và validate dữ liệu
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      // Nếu validation thất bại, throw ZodError để error handler xử lý
      throw result.error;
    }

    // Gán lại dữ liệu đã được parse (đã transform và coerce)
    req[source] = result.data;
    next();
  };
