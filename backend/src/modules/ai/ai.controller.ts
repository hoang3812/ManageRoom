import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { sendSuccess } from '../../utils/response';
import * as aiService from './ai.service';

export const chat = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { message, history } = req.body;
  const reply = await aiService.chat(message, history || [], req.user!.id);
  sendSuccess(res, { reply }, 'Thành công');
};

export const analyzeRevenue = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const analysis = await aiService.analyzeRevenue(req.user!.id);
  sendSuccess(res, { analysis }, 'Phân tích doanh thu thành công');
};

export const getSuggestions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const suggestions = await aiService.getSuggestions(req.user!.id);
  sendSuccess(res, { suggestions }, 'Lấy gợi ý thành công');
};
