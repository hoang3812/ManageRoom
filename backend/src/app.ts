import 'express-async-errors';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Server as SocketIOServer } from 'socket.io';

import { env } from './config/env';
import logger from './utils/logger';
import { errorHandler } from './middlewares/error.middleware';
import { setupChatSocket } from './sockets/chat.socket';

// ── Routes ────────────────────────────────────────────────────
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/user.routes';
import propertyRoutes from './modules/properties/property.routes';
import roomRoutes from './modules/rooms/room.routes';
import tenantRoutes from './modules/tenants/tenant.routes';
import contractRoutes from './modules/contracts/contract.routes';
import utilityRoutes from './modules/utilities/utility.routes';
import invoiceRoutes from './modules/invoices/invoice.routes';
import paymentRoutes from './modules/payments/payment.routes';
import maintenanceRoutes from './modules/maintenance/maintenance.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import chatRoutes from './modules/chat/chat.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import reportRoutes from './modules/reports/report.routes';
import aiRoutes from './modules/ai/ai.routes';

// ── App ───────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ── Socket.IO ─────────────────────────────────────────────────
export const io = new SocketIOServer(server, {
  cors: {
    origin: env.FRONTEND_URL,
    credentials: true,
  },
});
setupChatSocket(io);

// ── Security ──────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: [env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, message: 'Quá nhiều request, vui lòng thử lại sau' },
});
app.use(limiter);

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ── API Routes ────────────────────────────────────────────────
const prefix = env.API_PREFIX;
app.use(`${prefix}/auth`, authRoutes);
app.use(`${prefix}/users`, userRoutes);
app.use(`${prefix}/properties`, propertyRoutes);
app.use(`${prefix}/rooms`, roomRoutes);
app.use(`${prefix}/tenants`, tenantRoutes);
app.use(`${prefix}/contracts`, contractRoutes);
app.use(`${prefix}/utilities`, utilityRoutes);
app.use(`${prefix}/invoices`, invoiceRoutes);
app.use(`${prefix}/payments`, paymentRoutes);
app.use(`${prefix}/maintenance`, maintenanceRoutes);
app.use(`${prefix}/notifications`, notificationRoutes);
app.use(`${prefix}/chat`, chatRoutes);
app.use(`${prefix}/dashboard`, dashboardRoutes);
app.use(`${prefix}/reports`, reportRoutes);
app.use(`${prefix}/ai`, aiRoutes);

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} không tồn tại` });
});

// ── Global Error Handler ──────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────
const PORT = env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`🚀 RMS Backend đang chạy tại http://localhost:${PORT}`);
  logger.info(`📡 API prefix: ${prefix}`);
  logger.info(`🌍 Environment: ${env.NODE_ENV}`);
});

export default app;
