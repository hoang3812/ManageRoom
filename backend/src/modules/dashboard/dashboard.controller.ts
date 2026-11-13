import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { sendSuccess } from '../../utils/response';
import * as dashboardService from './dashboard.service';

export const getStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const stats = await dashboardService.getDashboardStats(req.user!.id);
  sendSuccess(res, stats, 'Lấy thống kê dashboard thành công');
};

export const getRevenueChart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const months = parseInt((req.query.months as string) || '12');
  const data = await dashboardService.getRevenueChart(req.user!.id, months);
  sendSuccess(res, data, 'Lấy biểu đồ doanh thu thành công');
};

export const getOccupancyByProperty = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const data = await dashboardService.getOccupancyByProperty(req.user!.id);
  sendSuccess(res, data, 'Lấy tỉ lệ lấp đầy theo khu trọ thành công');
};

export const getRecentInvoices = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const limit = parseInt((req.query.limit as string) || '5');
  const data = await dashboardService.getRecentInvoices(req.user!.id, limit);
  sendSuccess(res, data, 'Lấy hóa đơn gần đây thành công');
};
