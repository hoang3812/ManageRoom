import nodemailer from 'nodemailer';
import { env } from './env';

export const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export const sendEmail = async (to: string, subject: string, html: string) => {
  if (!env.SMTP_HOST) {
    console.log('Email mock sent:', { to, subject });
    return;
  }
  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    html,
  });
};
