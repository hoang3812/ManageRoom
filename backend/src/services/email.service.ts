/**
 * services/email.service.ts
 * Dịch vụ gửi email sử dụng Nodemailer
 * Hỗ trợ: email xác thực, reset mật khẩu, thông báo hóa đơn
 */

import nodemailer from 'nodemailer';
import { env } from '../config/env';
import logger from '../utils/logger';

// Tạo transporter với cấu hình SMTP từ env
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465, // SSL cho port 465, STARTTLS cho các port khác
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

/**
 * Hàm gửi email cơ bản
 * @param to - Địa chỉ email nhận
 * @param subject - Tiêu đề email
 * @param html - Nội dung HTML
 */
const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  try {
    await transporter.sendMail({
      from: env.SMTP_FROM || 'RMS System <noreply@rms.vn>',
      to,
      subject,
      html,
    });
    logger.info(`Email đã gửi đến: ${to} - Chủ đề: ${subject}`);
  } catch (error) {
    logger.error(`Gửi email thất bại đến ${to}:`, error);
    throw error;
  }
};

/**
 * Template email với thiết kế hiện đại
 * @param title - Tiêu đề email
 * @param content - Nội dung HTML bên trong
 */
const emailTemplate = (title: string, content: string): string => `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:32px;text-align:center;">
              <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">🏠 RMS - Quản Lý Phòng Trọ</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:40px 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:24px 32px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:13px;margin:0;">
                © 2024 RMS - Hệ thống Quản lý Phòng trọ<br>
                Email này được gửi tự động, vui lòng không trả lời.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export const emailService = {
  /**
   * Gửi email xác thực địa chỉ email sau khi đăng ký
   * @param email - Email người dùng
   * @param fullName - Họ tên người dùng
   * @param token - Token xác thực
   */
  async sendVerificationEmail(
    email: string,
    fullName: string,
    token: string
  ): Promise<void> {
    const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;
    const content = `
      <h2 style="color:#1e293b;margin-bottom:8px;">Xin chào, ${fullName}! 👋</h2>
      <p style="color:#64748b;line-height:1.6;">
        Cảm ơn bạn đã đăng ký tài khoản RMS. Vui lòng nhấn vào nút bên dưới để xác thực địa chỉ email của bạn:
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${verifyUrl}" style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:16px;display:inline-block;">
          ✉️ Xác Thực Email
        </a>
      </div>
      <p style="color:#94a3b8;font-size:13px;">
        Link xác thực có hiệu lực trong 24 giờ. Nếu bạn không đăng ký tài khoản này, hãy bỏ qua email này.
      </p>
    `;
    await sendEmail(email, 'Xác thực email - RMS', emailTemplate('Xác thực email', content));
  },

  /**
   * Gửi email reset mật khẩu
   */
  async sendResetPasswordEmail(
    email: string,
    fullName: string,
    token: string
  ): Promise<void> {
    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;
    const content = `
      <h2 style="color:#1e293b;margin-bottom:8px;">Đặt lại mật khẩu 🔑</h2>
      <p style="color:#64748b;line-height:1.6;">
        Xin chào <strong>${fullName}</strong>, chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${resetUrl}" style="background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:16px;display:inline-block;">
          🔒 Đặt lại mật khẩu
        </a>
      </div>
      <p style="color:#94a3b8;font-size:13px;">
        Link này có hiệu lực trong 60 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
      </p>
    `;
    await sendEmail(email, 'Đặt lại mật khẩu - RMS', emailTemplate('Đặt lại mật khẩu', content));
  },

  /**
   * Gửi thông báo hóa đơn mới cho người thuê
   */
  async sendInvoiceNotification(
    email: string,
    fullName: string,
    invoiceCode: string,
    amount: number,
    dueDate: string,
    roomNumber: string
  ): Promise<void> {
    const formattedAmount = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);

    const content = `
      <h2 style="color:#1e293b;margin-bottom:8px;">Hóa đơn tháng mới 📄</h2>
      <p style="color:#64748b;">Xin chào <strong>${fullName}</strong>,</p>
      <p style="color:#64748b;line-height:1.6;">Hóa đơn tiền phòng của bạn đã được tạo:</p>
      <div style="background:#f8fafc;border-radius:8px;padding:20px;margin:20px 0;">
        <table width="100%">
          <tr><td style="color:#64748b;">Mã hóa đơn:</td><td style="text-align:right;font-weight:600;color:#1e293b;">${invoiceCode}</td></tr>
          <tr><td style="color:#64748b;padding-top:8px;">Phòng:</td><td style="text-align:right;padding-top:8px;font-weight:600;color:#1e293b;">${roomNumber}</td></tr>
          <tr><td style="color:#64748b;padding-top:8px;">Số tiền:</td><td style="text-align:right;padding-top:8px;font-weight:700;color:#667eea;font-size:18px;">${formattedAmount}</td></tr>
          <tr><td style="color:#64748b;padding-top:8px;">Hạn thanh toán:</td><td style="text-align:right;padding-top:8px;font-weight:600;color:#ef4444;">${dueDate}</td></tr>
        </table>
      </div>
      <div style="text-align:center;margin-top:24px;">
        <a href="${env.FRONTEND_URL}/invoices" style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;display:inline-block;">
          💳 Thanh toán ngay
        </a>
      </div>
    `;
    await sendEmail(email, `Hóa đơn ${invoiceCode} - RMS`, emailTemplate('Hóa đơn mới', content));
  },
};
