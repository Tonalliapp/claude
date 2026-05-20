import { Router } from 'express';
import { chatHandler } from './ai.controller';
import { validate } from '../../middleware/validator';
import { aiChatSchema } from './ai.schema';

const router = Router();

router.post('/chat', validate({ body: aiChatSchema }), chatHandler);

export default router;
