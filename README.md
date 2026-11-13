# 🏘️ RMS - Hệ thống Quản lý Phòng trọ

> **Rental Management System** — Quản lý toàn bộ hoạt động kinh doanh cho thuê phòng trọ một cách tập trung, hiện đại và hiệu quả.

## 📁 Cấu trúc dự án

```
ManageRoom/
├── backend/               # Node.js + Express + TypeScript
│   ├── prisma/            # Database schema (PostgreSQL)
│   ├── src/
│   │   ├── config/        # Database, Redis, Cloudinary, Firebase, Email
│   │   ├── middlewares/   # Auth, Error handler, Upload, Validate
│   │   ├── modules/       # Các module nghiệp vụ
│   │   │   ├── auth/      # Đăng nhập, đăng ký, refresh token
│   │   │   ├── users/     # Quản lý người dùng
│   │   │   ├── properties/# Quản lý khu trọ
│   │   │   ├── rooms/     # Quản lý phòng
│   │   │   ├── tenants/   # Quản lý người thuê
│   │   │   ├── contracts/ # Hợp đồng thuê
│   │   │   ├── utilities/ # Chỉ số điện nước
│   │   │   ├── invoices/  # Hóa đơn
│   │   │   ├── payments/  # Thanh toán (Cash + VNPay)
│   │   │   ├── maintenance/# Bảo trì, sửa chữa
│   │   │   ├── notifications/# Thông báo đẩy (FCM)
│   │   │   ├── chat/      # Nhắn tin real-time (Socket.IO)
│   │   │   ├── dashboard/ # Thống kê tổng quan
│   │   │   ├── reports/   # Báo cáo + xuất Excel
│   │   │   └── ai/        # AI Assistant (Gemini)
│   │   ├── sockets/       # Socket.IO handlers
│   │   ├── services/      # Email, Notification
│   │   ├── utils/         # JWT, Response, VNPay, Logger...
│   │   └── app.ts         # Entry point
│   ├── .env.example       # Mẫu biến môi trường
│   └── Dockerfile
│
├── frontend/              # Next.js 14 + TailwindCSS + TypeScript
│   ├── app/
│   │   ├── (auth)/        # Login, Register
│   │   └── (dashboard)/   # Các trang quản lý
│   │       ├── dashboard/     # Tổng quan, biểu đồ
│   │       ├── properties/    # Khu trọ
│   │       ├── rooms/         # Phòng
│   │       ├── tenants/       # Người thuê
│   │       ├── contracts/     # Hợp đồng
│   │       ├── utilities/     # Điện nước
│   │       ├── invoices/      # Hóa đơn
│   │       ├── payments/      # Thanh toán
│   │       ├── maintenance/   # Bảo trì
│   │       ├── reports/       # Báo cáo
│   │       ├── chat/          # Chat real-time
│   │       ├── ai-assistant/  # AI trợ lý
│   │       ├── notifications/ # Thông báo
│   │       └── settings/      # Cài đặt
│   ├── components/        # UI components
│   ├── services/          # API service functions
│   ├── store/             # Zustand state management
│   ├── lib/               # Axios client, utils
│   ├── types/             # TypeScript types
│   └── .env.local         # Biến môi trường
│
└── docker-compose.yml     # PostgreSQL + Redis + Backend + Frontend
```

## 🚀 Hướng dẫn chạy

### Yêu cầu
- Node.js 20+
- PostgreSQL 15+
- Redis 7+

### 1. Cài đặt Backend

```bash
cd backend

# Sao chép file env
cp .env.example .env
# Chỉnh sửa .env với thông tin thực

# Cài dependencies
npm install

# Chạy migration database
npx prisma migrate dev --name init

# Khởi động dev server
npm run dev
# → http://localhost:5000
```

### 2. Cài đặt Frontend

```bash
cd frontend

# .env.local đã được tạo sẵn
npm install

npm run dev
# → http://localhost:3000
```

### 3. Docker Compose (Khuyến nghị)

```bash
# Tạo file backend/.env từ .env.example
cp backend/.env.example backend/.env

# Khởi động tất cả services
docker-compose up -d
```

## 🛠️ Công nghệ sử dụng

| Layer | Công nghệ |
|-------|-----------|
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Cache | Redis (ioredis) |
| Auth | JWT (Access + Refresh token) |
| Real-time | Socket.IO |
| Storage | Cloudinary |
| Push Notification | Firebase FCM |
| Payment | VNPay |
| AI | Google Gemini |
| Email | Nodemailer (SMTP) |
| Frontend | Next.js 14, TailwindCSS |
| State | Zustand + TanStack Query |
| Charts | Recharts |
| Deploy | Docker + Docker Compose |

## 📋 Tính năng chính

| Module | Tính năng |
|--------|-----------|
| 🏘️ Khu trọ | CRUD, upload ảnh Cloudinary |
| 🚪 Phòng | CRUD, lọc trạng thái, upload ảnh |
| 👥 Người thuê | Quản lý hồ sơ, CCCD, liên hệ khẩn cấp |
| 📄 Hợp đồng | Tạo/chấm dứt/gia hạn, cảnh báo sắp hết hạn |
| ⚡ Điện/Nước | Nhập chỉ số hàng tháng, tính tiền tự động |
| 🧾 Hóa đơn | Tạo hàng loạt, theo dõi trạng thái |
| 💳 Thanh toán | Tiền mặt + VNPay online |
| 🔧 Bảo trì | Tiếp nhận, phân công, theo dõi xử lý |
| 📊 Báo cáo | Doanh thu, công nợ, lấp đầy, xuất Excel |
| 💬 Chat | Nhắn tin real-time Socket.IO |
| 🤖 AI | Phân tích doanh thu, gợi ý quản lý (Gemini) |
| 🔔 Thông báo | Push notification FCM, in-app |

## 🔑 API Endpoints

```
POST   /api/v1/auth/login
POST   /api/v1/auth/register
POST   /api/v1/auth/refresh-token
GET    /api/v1/properties
GET    /api/v1/rooms
GET    /api/v1/tenants
GET    /api/v1/contracts
GET    /api/v1/invoices
POST   /api/v1/payments/cash
POST   /api/v1/payments/vnpay
GET    /api/v1/dashboard/overview
GET    /api/v1/reports/revenue
GET    /api/v1/reports/revenue/export (Excel)
POST   /api/v1/ai/chat
GET    /api/v1/ai/analyze-revenue
...và nhiều hơn nữa
```
