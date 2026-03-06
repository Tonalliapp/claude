import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { AppError } from './errorHandler';

const TIMESTAMP_TOLERANCE_S = 5 * 60; // 5 minutes in seconds

/**
 * Verifies HMAC-SHA256 signature for delivery partner requests (Yesswera).
 *
 * Expected headers:
 *  - X-Yesswera-Signature: HMAC-SHA256(apiKey, "{timestamp}.{rawBody}")
 *  - X-Yesswera-Timestamp: Unix timestamp in seconds
 *
 * Payload format: "{timestamp}.{rawBody}"  (dot separator)
 * Signature: lowercase hex string
 *
 * On success, sets req.tenantId from the matched TenantIntegration.
 */
export function deliveryAuth() {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const timestamp = req.headers['x-yesswera-timestamp'] as string | undefined;
      const signature = req.headers['x-yesswera-signature'] as string | undefined;

      if (!timestamp || !signature) {
        throw new AppError(401, 'Missing delivery authentication headers', 'DELIVERY_AUTH_MISSING');
      }

      // Validate timestamp freshness (timestamp is in seconds)
      const ts = Number(timestamp);
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (isNaN(ts) || Math.abs(nowSeconds - ts) > TIMESTAMP_TOLERANCE_S) {
        throw new AppError(401, 'Delivery request timestamp expired or invalid', 'DELIVERY_TIMESTAMP_INVALID');
      }

      // Find the tenant integration by slug
      const slug = req.body?.slug as string | undefined;
      if (!slug) {
        throw new AppError(400, 'Missing slug in request body', 'SLUG_REQUIRED');
      }

      const tenant = await prisma.tenant.findUnique({
        where: { slug },
        select: { id: true, status: true },
      });

      if (!tenant || tenant.status !== 'active') {
        throw new AppError(404, 'Restaurante no encontrado o inactivo', 'TENANT_NOT_FOUND');
      }

      const integration = await prisma.tenantIntegration.findUnique({
        where: { tenantId: tenant.id },
      });

      if (!integration || !integration.active || integration.platform !== 'yesswera') {
        throw new AppError(403, 'Integration not configured or inactive', 'INTEGRATION_INACTIVE');
      }

      // Verify HMAC signature: HMAC-SHA256(apiKey, "{timestamp}.{rawBody}")
      // Use the raw body captured during parsing to avoid re-serialization key-order issues
      const rawBody = (req as any).rawBody as string | undefined;
      if (!rawBody) {
        throw new AppError(400, 'Missing request body', 'BODY_REQUIRED');
      }
      const payload = `${timestamp}.${rawBody}`;
      const expected = crypto
        .createHmac('sha256', integration.apiKey)
        .update(payload)
        .digest('hex');

      if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) {
        throw new AppError(401, 'Invalid delivery signature', 'INVALID_SIGNATURE');
      }

      // Auth success — set tenant context
      req.tenantId = tenant.id;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Lightweight HMAC auth for GET endpoints where slug comes from a query param.
 * Yesswera signs: "{timestamp}.{\"slug\":\"mi-restaurante\"}"
 */
export function deliveryAuthGet() {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const timestamp = req.headers['x-yesswera-timestamp'] as string | undefined;
      const signature = req.headers['x-yesswera-signature'] as string | undefined;
      const slug = req.query.slug as string | undefined;

      if (!timestamp || !signature) {
        throw new AppError(401, 'Missing delivery authentication headers', 'DELIVERY_AUTH_MISSING');
      }

      if (!slug) {
        throw new AppError(400, 'Missing slug query parameter', 'SLUG_REQUIRED');
      }

      // Validate timestamp freshness
      const ts = Number(timestamp);
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (isNaN(ts) || Math.abs(nowSeconds - ts) > TIMESTAMP_TOLERANCE_S) {
        throw new AppError(401, 'Delivery request timestamp expired or invalid', 'DELIVERY_TIMESTAMP_INVALID');
      }

      const tenant = await prisma.tenant.findUnique({
        where: { slug },
        select: { id: true, status: true },
      });

      if (!tenant || tenant.status !== 'active') {
        throw new AppError(404, 'Restaurante no encontrado o inactivo', 'TENANT_NOT_FOUND');
      }

      const integration = await prisma.tenantIntegration.findUnique({
        where: { tenantId: tenant.id },
      });

      if (!integration || !integration.active || integration.platform !== 'yesswera') {
        throw new AppError(403, 'Integration not configured or inactive', 'INTEGRATION_INACTIVE');
      }

      // For GET requests, Yesswera signs: "{timestamp}.{\"slug\":\"mi-restaurante\"}"
      const syntheticBody = JSON.stringify({ slug });
      const payload = `${timestamp}.${syntheticBody}`;
      const expected = crypto
        .createHmac('sha256', integration.apiKey)
        .update(payload)
        .digest('hex');

      if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) {
        throw new AppError(401, 'Invalid delivery signature', 'INVALID_SIGNATURE');
      }

      req.tenantId = tenant.id;
      next();
    } catch (error) {
      next(error);
    }
  };
}
