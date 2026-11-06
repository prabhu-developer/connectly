import type { Socket } from "socket.io";
import { verifyAccessToken } from "../utils/token.utils.js";
import { logger } from "../config/logger.js";

export interface AuthenticatedSocketUser {
  id: string;
  email: string;
  username: string;
}

declare module "socket.io" {
  interface SocketData {
    user?: AuthenticatedSocketUser;
  }
}

export function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): void {
  try {
    let token: string | undefined = socket.handshake.auth?.token;

    if (!token && socket.handshake.headers.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim();
      }
    }

    if (!token) {
      logger.warn({ socketId: socket.id }, "Socket connection rejected: missing auth token");
      return next(new Error("Authentication error: Token required"));
    }

    const payload = verifyAccessToken(token);

    socket.data.user = {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
    };

    logger.debug(
      { socketId: socket.id, userId: payload.sub, username: payload.username },
      "Socket handshake authenticated successfully"
    );

    next();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid or expired token";
    logger.warn({ socketId: socket.id, message }, "Socket connection rejected: auth failed");
    next(new Error(`Authentication error: ${message}`));
  }
}
