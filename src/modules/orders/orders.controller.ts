import { Request, Response, NextFunction } from 'express';
import * as ordersService from './orders.service';
import type { ListQuery } from './orders.schema';
import { generateReceipt } from '../../utils/generateReceipt';
import { prisma } from '../../config/database';
import { logAudit } from '../audit/audit.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await ordersService.list(req.tenantId!, req.query as unknown as ListQuery);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await ordersService.getById(req.tenantId!, req.params.id as string);
    res.json(order);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await ordersService.create(req.tenantId!, req.body, req.user?.userId);
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
}

export async function createPosOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await ordersService.createPosOrder(req.tenantId!, req.body, req.user!.userId);
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await ordersService.updateStatus(req.tenantId!, req.params.id as string, req.body.status);
    logAudit({
      tenantId: req.tenantId!,
      userId: req.user!.userId,
      action: 'order.status_change',
      targetType: 'order',
      targetId: order.id,
      details: { orderNumber: order.orderNumber, newStatus: req.body.status },
      ipAddress: req.ip,
    });
    res.json(order);
  } catch (error) {
    next(error);
  }
}

export async function cancelOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await ordersService.cancelOrder(req.tenantId!, req.params.id as string, req.body.reason);
    logAudit({
      tenantId: req.tenantId!,
      userId: req.user!.userId,
      action: 'order.cancel',
      targetType: 'order',
      targetId: order.id,
      details: { orderNumber: order.orderNumber, reason: req.body.reason },
      ipAddress: req.ip,
    });
    res.json(order);
  } catch (error) {
    next(error);
  }
}

export async function updateItemStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await ordersService.updateItemStatus(
      req.tenantId!,
      req.params.id as string,
      req.params.itemId as string,
      req.body.status,
    );
    res.json(item);
  } catch (error) {
    next(error);
  }
}

export async function receipt(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await ordersService.getById(req.tenantId!, req.params.id as string);

    const [tenant, payment] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: req.tenantId! },
        select: { name: true, config: true },
      }),
      prisma.payment.findFirst({
        where: { orderId: order.id },
        orderBy: { createdAt: 'desc' },
        select: { method: true },
      }),
    ]);

    const cfg = (tenant?.config as Record<string, unknown>) ?? {};

    const pdf = await generateReceipt({
      restaurantName: tenant?.name ?? 'Restaurante',
      address: (cfg.address as string) || undefined,
      phone: (cfg.phone as string) || undefined,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      tableName: order.table?.number != null ? String(order.table.number) : undefined,
      customerName: order.customerName ?? undefined,
      deliveryAddress: order.deliveryAddress ?? undefined,
      items: order.items.map((i: { product: { name: string }; quantity: number; unitPrice: unknown; subtotal: unknown; notes?: string | null }) => ({
        name: i.product.name,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        subtotal: Number(i.subtotal),
        notes: i.notes,
      })),
      subtotal: Number(order.subtotal),
      total: Number(order.total),
      notes: order.notes,
      paymentMethod: payment?.method,
      paidAt: order.paidAt?.toISOString() ?? null,
      createdAt: order.createdAt.toISOString(),
      attendedBy: order.user?.name,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="ticket-${order.orderNumber}.pdf"`);
    res.send(pdf);
  } catch (error) {
    next(error);
  }
}
