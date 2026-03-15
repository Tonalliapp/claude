import { Request, Response, NextFunction } from 'express';
import * as tablesService from './tables.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const tables = await tablesService.list(req.tenantId!);
    res.json(tables);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const table = await tablesService.create(req.tenantId!, req.body);
    res.status(201).json(table);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const table = await tablesService.update(req.tenantId!, req.params.id as string, req.body);
    res.json(table);
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await tablesService.remove(req.tenantId!, req.params.id as string);
    res.json({ message: 'Mesa eliminada' });
  } catch (error) {
    next(error);
  }
}

export async function getQR(req: Request, res: Response, next: NextFunction) {
  try {
    const qr = await tablesService.getQR(req.tenantId!, req.params.id as string);
    res.json(qr);
  } catch (error) {
    next(error);
  }
}

export async function getQRImage(req: Request, res: Response, next: NextFunction) {
  try {
    const qr = await tablesService.getQR(req.tenantId!, req.params.id as string);
    const base64Data = qr.qrCode.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    res.set({
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="mesa-${qr.tableNumber}-qr.png"`,
      'Content-Length': buffer.length.toString(),
    });
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const table = await tablesService.updateStatus(req.tenantId!, req.params.id as string, req.body.status);
    res.json(table);
  } catch (error) {
    next(error);
  }
}

export async function getBrandedQR(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await tablesService.getBrandedQR(req.tenantId!, req.params.id as string, req.body);
    res.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Content-Length': result.buffer.length.toString(),
    });
    res.send(result.buffer);
  } catch (error) {
    next(error);
  }
}

export async function getBatchQR(req: Request, res: Response, next: NextFunction) {
  try {
    const zipBuffer = await tablesService.getBatchQR(req.tenantId!, req.body);
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="qr-mesas.zip"',
      'Content-Length': zipBuffer.length.toString(),
    });
    res.send(zipBuffer);
  } catch (error) {
    next(error);
  }
}
