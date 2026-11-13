/**
 * modules/invoices/invoice.controller.ts
 */

import { Response } from 'express';
import { invoiceService } from './invoice.service';
import { sendSuccess } from '../../utils/response';
import { buildPaginationMeta } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

export const invoiceController = {
  /**
   * POST /api/v1/invoices/generate
   * Sinh hóa đơn cho một hợp đồng trong tháng
   */
  async generateInvoice(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { contractId, month, year } = req.body as {
      contractId: string;
      month: number;
      year: number;
    };
    const invoice = await invoiceService.generateInvoice(
      contractId,
      month,
      year,
      req.user!.id
    );
    sendSuccess(res, invoice, 'Sinh hóa đơn thành công', 201);
  },

  /**
   * POST /api/v1/invoices/generate-bulk
   * Sinh hóa đơn hàng loạt cho toàn bộ khu trọ
   */
  async generateBulkInvoices(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { propertyId, month, year } = req.body as {
      propertyId: string;
      month: number;
      year: number;
    };
    const result = await invoiceService.generateBulkInvoices(
      propertyId,
      month,
      year,
      req.user!.id
    );
    sendSuccess(res, result, 'Sinh hóa đơn hàng loạt hoàn tất');
  },

  async listInvoices(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { page = '1', limit = '10', status, month, year, propertyId } = req.query as {
      page?: string; limit?: string; status?: string;
      month?: string; year?: string; propertyId?: string;
    };
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const { invoices, total } = await invoiceService.listInvoices(req.user!.id, {
      page: pageNum,
      limit: limitNum,
      status,
      month: month ? parseInt(month) : undefined,
      year: year ? parseInt(year) : undefined,
      propertyId,
    });

    const meta = buildPaginationMeta(pageNum, limitNum, total);
    sendSuccess(res, invoices, 'Lấy danh sách hóa đơn thành công', 200, meta);
  },

  async getMyInvoices(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { page = '1', limit = '10', status } = req.query as {
      page?: string; limit?: string; status?: string;
    };
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const { invoices, total } = await invoiceService.getTenantInvoices(req.user!.id, {
      page: pageNum,
      limit: limitNum,
      status,
    });

    const meta = buildPaginationMeta(pageNum, limitNum, total);
    sendSuccess(res, invoices, 'Lấy hóa đơn của bạn thành công', 200, meta);
  },

  async getInvoiceById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const invoice = await invoiceService.getInvoiceById(req.params.id, req.user!.id);
    sendSuccess(res, invoice, 'Lấy chi tiết hóa đơn thành công');
  },

  async getDebtSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { propertyId } = req.query as { propertyId?: string };
    const summary = await invoiceService.getDebtSummary(req.user!.id, propertyId);
    sendSuccess(res, summary, 'Thống kê công nợ thành công');
  },
};
