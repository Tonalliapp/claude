import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { authConfig } from '../config/auth';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { tenantRoom, kitchenRoom, tableRoom } from './rooms';
import type { JwtPayload } from '../middleware/authenticate';

let io: Server;

export function getIO(): Server {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

export function initSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: env.CORS_ORIGINS.split(',').filter(Boolean),
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // Staff namespace — requires JWT auth
  const staffNsp = io.of('/staff');
  staffNsp.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const payload = jwt.verify(token, authConfig.accessToken.secret) as JwtPayload;
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  staffNsp.on('connection', (socket: Socket) => {
    const user = socket.data.user as JwtPayload;
    logger.info(`[WS] Staff connected: ${user.userId} (${user.role})`);

    // Auto-join tenant room
    socket.join(tenantRoom(user.tenantId));

    // Kitchen role auto-joins kitchen room
    if (user.role === 'kitchen') {
      socket.join(kitchenRoom(user.tenantId));
    }

    socket.on('disconnect', () => {
      logger.info(`[WS] Staff disconnected: ${user.userId}`);
    });
  });

  // Client namespace — for customers at tables (no JWT, uses table token)
  const clientNsp = io.of('/client');
  clientNsp.on('connection', (socket: Socket) => {
    const { tenantId, tableId } = socket.handshake.auth;
    if (!tenantId || !tableId) {
      socket.disconnect();
      return;
    }

    logger.info(`[WS] Client connected: table ${tableId}`);
    socket.join(tableRoom(tenantId, tableId));

    socket.on('disconnect', () => {
      logger.info(`[WS] Client disconnected: table ${tableId}`);
    });
  });

  logger.info('[WS] Socket.io initialized');
  return io;
}
