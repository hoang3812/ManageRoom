/**
 * modules/contracts/contract.controller.ts
 * modules/contracts/contract.routes.ts
 */

import { Response } from 'express';
import { contractService } from './contract.service';
import { sendSuccess } from '../../utils/response';
import { buildPaginationMeta } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';
import {
  CreateContractDto,
  RenewContractDto,
  TerminateContractDto,
} from './contract.schema';

export const contractController = {
  async createContract(req: AuthenticatedRequest, res: Response): Promise<void> {
    const data = req.body as CreateContractDto;
    const contract = await contractService.createContract(req.user!.id, data);
    sendSuccess(res, contract, 'Tạo hợp đồng thành công', 201);
  },

  async listContracts(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { page = '1', limit = '10', status, propertyId, search } = req.query as {
      page?: string; limit?: string; status?: string; propertyId?: string; search?: string;
    };
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const { contracts, total } = await contractService.listContracts(req.user!.id, {
      page: pageNum,
      limit: limitNum,
      status,
      propertyId,
      search,
    });

    const meta = buildPaginationMeta(pageNum, limitNum, total);
    sendSuccess(res, contracts, 'Lấy danh sách hợp đồng thành công', 200, meta);
  },

  async getMyContracts(req: AuthenticatedRequest, res: Response): Promise<void> {
    const contracts = await contractService.getTenantContracts(req.user!.id);
    sendSuccess(res, contracts, 'Lấy hợp đồng của bạn thành công');
  },

  async getContractById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const contract = await contractService.getContractById(req.params.id, req.user!.id);
    sendSuccess(res, contract, 'Lấy chi tiết hợp đồng thành công');
  },

  async renewContract(req: AuthenticatedRequest, res: Response): Promise<void> {
    const data = req.body as RenewContractDto;
    const contract = await contractService.renewContract(req.params.id, req.user!.id, data);
    sendSuccess(res, contract, 'Gia hạn hợp đồng thành công');
  },

  async terminateContract(req: AuthenticatedRequest, res: Response): Promise<void> {
    const data = req.body as TerminateContractDto;
    const contract = await contractService.terminateContract(req.params.id, req.user!.id, data);
    sendSuccess(res, contract, 'Chấm dứt hợp đồng thành công');
  },
};
