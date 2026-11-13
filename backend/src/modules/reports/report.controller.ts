import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { sendSuccess, sendError } from '../../utils/response';
import * as reportService from './report.service';
import ExcelJS from 'exceljs';

export const getRevenueReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { fromMonth = 1, fromYear, toMonth = 12, toYear } = req.query as Record<string, string>;
  const year = new Date().getFullYear();
  const data = await reportService.getRevenueReport(
    req.user!.id,
    parseInt(fromMonth as string) || 1,
    parseInt(fromYear as string) || year,
    parseInt(toMonth as string) || 12,
    parseInt(toYear as string) || year,
  );
  sendSuccess(res, data, 'Báo cáo doanh thu thành công');
};

export const getOccupancyReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const data = await reportService.getOccupancyReport(req.user!.id);
  sendSuccess(res, data, 'Báo cáo tình trạng phòng thành công');
};

export const getDebtReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const data = await reportService.getDebtReport(req.user!.id);
  sendSuccess(res, data, 'Báo cáo công nợ thành công');
};

export const exportRevenueExcel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const year = new Date().getFullYear();
  const { fromMonth = '1', fromYear = String(year), toMonth = '12', toYear = String(year) } = req.query as Record<string, string>;

  const data = await reportService.getRevenueReport(
    req.user!.id,
    parseInt(fromMonth), parseInt(fromYear),
    parseInt(toMonth), parseInt(toYear)
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RMS System';
  workbook.created = new Date();

  // Sheet 1: Tổng hợp theo tháng
  const summarySheet = workbook.addWorksheet('Tổng hợp doanh thu');
  summarySheet.columns = [
    { header: 'Tháng', key: 'month', width: 15 },
    { header: 'Doanh thu (VNĐ)', key: 'revenue', width: 20 },
    { header: 'Số giao dịch', key: 'count', width: 15 },
  ];
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
  summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  data.byMonth.forEach(row => summarySheet.addRow(row));

  // Sheet 2: Theo khu trọ
  const propertySheet = workbook.addWorksheet('Theo khu trọ');
  propertySheet.columns = [
    { header: 'Khu trọ', key: 'propertyName', width: 25 },
    { header: 'Doanh thu (VNĐ)', key: 'revenue', width: 20 },
  ];
  propertySheet.getRow(1).font = { bold: true };
  data.byProperty.forEach(row => propertySheet.addRow(row));

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="bao-cao-doanh-thu-${fromMonth}-${fromYear}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
};

export const exportDebtExcel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const data = await reportService.getDebtReport(req.user!.id);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Công nợ');
  sheet.columns = [
    { header: 'Mã HĐ', key: 'invoiceCode', width: 15 },
    { header: 'Tháng', key: 'month', width: 10 },
    { header: 'Người thuê', key: 'tenant', width: 25 },
    { header: 'SĐT', key: 'tenantPhone', width: 15 },
    { header: 'Khu trọ', key: 'property', width: 20 },
    { header: 'Phòng', key: 'room', width: 10 },
    { header: 'Tổng tiền', key: 'totalAmount', width: 15 },
    { header: 'Đã trả', key: 'paidAmount', width: 15 },
    { header: 'Còn nợ', key: 'remainingAmount', width: 15 },
    { header: 'Trạng thái', key: 'status', width: 12 },
    { header: 'Hạn thanh toán', key: 'dueDate', width: 18 },
  ];
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
  data.invoices.forEach(row => sheet.addRow(row));

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="bao-cao-cong-no-${new Date().toISOString().split('T')[0]}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
};
