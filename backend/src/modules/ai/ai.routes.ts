/**
 * modules/ai/ai.routes.ts
 * Routes cho AI Assistant module
 */

import { Router, Response } from 'express';
import { aiService } from './ai.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

/**
 * POST /api/v1/ai/chat
 * Chat với AI Assistant
 * Body: { question: string }
 */
router.post('/chat', async (req: AuthenticatedRequest, res: Response) => {
  const { question } = req.body as { question: string };
  if (!question?.trim()) {
    res.status(400).json({ success: false, message: 'Câu hỏi không được để trống' });
    return;
  }
  const answer = await aiService.chat(req.user!.id, question);
  sendSuccess(res, { answer }, 'AI đã trả lời');
});

/**
 * GET /api/v1/ai/analyze-revenue?months=6
 * Phân tích doanh thu (OWNER)
 */
router.get(
  '/analyze-revenue',
  authorize('OWNER'),
  async (req: AuthenticatedRequest, res: Response) => {
    const months = parseInt(req.query.months as string) || 6;
    const analysis = await aiService.analyzeRevenue(req.user!.id, months);
    sendSuccess(res, { analysis }, 'Phân tích doanh thu thành công');
  }
);

/**
 * GET /api/v1/ai/suggestions
 * Gợi ý quản lý (OWNER/STAFF)
 */
router.get(
  '/suggestions',
  authorize('OWNER', 'STAFF'),
  async (req: AuthenticatedRequest, res: Response) => {
    const suggestions = await aiService.getSuggestions(req.user!.id);
    sendSuccess(res, { suggestions }, 'Lấy gợi ý thành công');
  }
);

export default router;
