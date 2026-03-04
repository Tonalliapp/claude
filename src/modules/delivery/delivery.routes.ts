import { Router } from 'express';
import { deliveryAuth, deliveryAuthGet } from '../../middleware/deliveryAuth';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validator';
import { createDeliveryOrderSchema, deliveryWebhookSchema, getOrderParamSchema, confirmPickupSchema } from './delivery.schema';
import * as ctrl from './delivery.controller';

const router = Router();

// POST endpoints — HMAC auth from request body (slug in body)
router.post('/orders', deliveryAuth(), validate({ body: createDeliveryOrderSchema }), ctrl.createOrder);
router.post('/webhook', deliveryAuth(), validate({ body: deliveryWebhookSchema }), ctrl.webhook);

// GET endpoints — HMAC auth from query params (slug in query)
router.get('/orders/:id', deliveryAuthGet(), validate({ params: getOrderParamSchema }), ctrl.getOrderStatus);

// Staff endpoints — JWT auth (restaurant staff confirms pickup)
router.post('/orders/:id/confirm-pickup', authenticate, validate({ params: getOrderParamSchema, body: confirmPickupSchema }), ctrl.confirmPickup);

export default router;
