// Types matching backend Prisma models

export type UserRole = 'OWNER' | 'STAFF' | 'TENANT';
export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE';
export type ContractStatus = 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'PENDING';
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'VNPAY' | 'BANK_TRANSFER';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
export type MaintenanceStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type NotificationType = 'INVOICE' | 'CONTRACT' | 'PAYMENT' | 'MAINTENANCE' | 'ANNOUNCEMENT' | 'SYSTEM';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: PaginationMeta;
  error?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  ward?: string;
  district?: string;
  province: string;
  description?: string;
  images: string[];
  isActive: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  _count?: { rooms: number };
}

export interface RoomType {
  id: string;
  name: string;
  description?: string;
}

export interface Room {
  id: string;
  roomNumber: string;
  floor?: number;
  area?: number;
  maxOccupants: number;
  basePrice: number;
  deposit: number;
  description?: string;
  images: string[];
  status: RoomStatus;
  propertyId: string;
  roomTypeId?: string;
  property?: Pick<Property, 'id' | 'name'>;
  roomType?: RoomType;
  createdAt: string;
  updatedAt: string;
}

export interface Tenant {
  id: string;
  userId: string;
  idCardNumber?: string;
  idCardFront?: string;
  idCardBack?: string;
  birthDate?: string;
  permanentAddress?: string;
  occupation?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  user: User;
  createdAt: string;
  updatedAt: string;
}

export interface Contract {
  id: string;
  contractCode: string;
  roomId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  deposit: number;
  depositPaid: boolean;
  terms?: string;
  fileUrl?: string;
  status: ContractStatus;
  room?: Room;
  tenant?: Tenant;
  createdAt: string;
  updatedAt: string;
}

export interface UtilityReading {
  id: string;
  roomId: string;
  month: number;
  year: number;
  electricPrev: number;
  electricCurr: number;
  electricRate: number;
  waterPrev: number;
  waterCurr: number;
  waterRate: number;
  recordedAt: string;
  room?: Pick<Room, 'id' | 'roomNumber'>;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceCode: string;
  contractId: string;
  month: number;
  year: number;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  status: InvoiceStatus;
  notes?: string;
  pdfUrl?: string;
  contract?: Contract;
  items?: InvoiceItem[];
  payments?: Payment[];
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  paymentCode: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  paidAt?: string;
  notes?: string;
  invoice?: Invoice;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceRequest {
  id: string;
  requestCode: string;
  roomId: string;
  requesterId: string;
  assigneeId?: string;
  title: string;
  description: string;
  images: string[];
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  scheduledAt?: string;
  completedAt?: string;
  cost?: number;
  notes?: string;
  rating?: number;
  feedback?: string;
  room?: Pick<Room, 'id' | 'roomNumber'>;
  requester?: User;
  assignee?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  fileUrl?: string;
  fileType?: string;
  isRead: boolean;
  createdAt: string;
  sender?: Pick<User, 'id' | 'fullName' | 'avatar'>;
}

export interface Conversation {
  id: string;
  title?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  participants: Array<{
    id: string;
    userId: string;
    user: Pick<User, 'id' | 'fullName' | 'avatar' | 'role'>;
  }>;
  messages?: Message[];
  partner?: Pick<User, 'id' | 'fullName' | 'avatar'>;
}

// Dashboard
export interface DashboardStats {
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  occupancyRate: number;
  currentMonthRevenue: number;
  lastMonthRevenue: number;
  revenueGrowth: number;
  overdueInvoices: number;
  pendingMaintenance: number;
  expiringContracts: number;
  totalTenants: number;
}

export interface RevenueChartData {
  month: string;
  label: string;
  total: number;
  cash: number;
  vnpay: number;
  transfer: number;
}

// Auth
export interface LoginRequest { email: string; password: string; }
export interface RegisterRequest { email: string; password: string; fullName: string; phone?: string; role?: UserRole; }
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
