import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validator';
import { z } from 'zod';
import * as ctrl from './push.controller';

const subscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

const router = Router();

router.get('/vapid-key', ctrl.getVapidKey);
router.post('/subscribe', authenticate, validate({ body: subscribeSchema }), ctrl.subscribe);
router.post('/unsubscribe', authenticate, validate({ body: unsubscribeSchema }), ctrl.unsubscribe);

export default router;
