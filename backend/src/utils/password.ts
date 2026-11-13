/**
 * utils/password.ts
 * Các hàm tiện ích để mã hóa và kiểm tra mật khẩu
 * Sử dụng bcryptjs với salt rounds = 12
 */

import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12; // Độ phức tạp của salt (cao hơn = an toàn hơn nhưng chậm hơn)

/**
 * Mã hóa mật khẩu plain text thành hash
 * @param password - Mật khẩu gốc
 * @returns Mật khẩu đã mã hóa
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * So sánh mật khẩu plain text với hash đã lưu
 * @param password - Mật khẩu người dùng nhập
 * @param hash - Hash đã lưu trong database
 * @returns true nếu khớp, false nếu không
 */
export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * Tạo token ngẫu nhiên (dùng cho email verify, reset password)
 * @returns Chuỗi hex ngẫu nhiên 64 ký tự
 */
export const generateRandomToken = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};
