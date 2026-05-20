import { Request, Response, NextFunction } from 'express';
import * as aiService from './ai.service';
import { AiChatInput } from './ai.schema';

export async function chatHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { context, message, history } = req.body as AiChatInput;
    const result = await aiService.chat(context, message, history);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
