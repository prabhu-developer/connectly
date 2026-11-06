import type { Socket } from "socket.io";
import { verifyAccessToken, hashToken } from "../utils/token.utils.js";
import { logger } from "../config/logger.js";
import { RefreshSession } from "../models/refresh-session.model.js";
import { User } from "../models/user.model.js";

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

export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> {
  try {
    let token: string | undefined = socket.handshake.auth?.token;

    // 1. Authorization header
    if (!token && socket.handshake.headers.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim();
      }
    }

    // 2. Access cookie from handshake headers
    if (!token && socket.handshake.headers.cookie) {
      const match = socket.handshake.headers.cookie.match(
        /(?:^|;\s*)(?:connectly_access|accessToken)=([^;]+)/
      );
      if (match && match[1]) {
        token = decodeURIComponent(match[1]);
      }
    }

    if (token) {
      try {
        const payload = verifyAccessToken(token);

        socket.data.user = {
          id: payload.sub,
          email: payload.email,
          username: payload.username,
        };

        logger.debug(
          { socketId: socket.id, userId: payload.sub, username: payload.username },
          "Socket handshake authenticated successfully via access token"
        );

        return next();
      } catch (tokenErr) {
        // If access token is expired or invalid, attempt refresh cookie fallback if available
        if (!socket.handshake.headers.cookie?.includes("connectly_refresh")) {
          throw tokenErr;
        }
      }
    }

    // 3. Refresh session cookie fallback
    if (socket.handshake.headers.cookie) {
      const refreshMatch = socket.handshake.headers.cookie.match(
        /(?:^|;\s*)connectly_refresh=([^;]+)/
      );
      if (refreshMatch && refreshMatch[1]) {
        const rawRefreshToken = decodeURIComponent(refreshMatch[1]);
        const incomingHash = hashToken(rawRefreshToken);
        const session = await RefreshSession.findOne({
          tokenHash: incomingHash,
          isRevoked: false,
          expiresAt: { $gt: new Date() },
        });

        if (session) {
          const user = await User.findById(session.userId);
          if (user) {
            socket.data.user = {
              id: user._id.toString(),
              email: user.email,
              username: user.username,
            };

            logger.debug(
              { socketId: socket.id, userId: user._id.toString(), username: user.username },
              "Socket handshake authenticated successfully via active refresh session"
            );

            return next();
          }
        }
      }
    }

    logger.warn({ socketId: socket.id }, "Socket connection rejected: missing auth credentials");
    return next(new Error("Authentication error: Token required"));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid or expired token";
    logger.warn({ socketId: socket.id, message }, "Socket connection rejected: auth failed");
    next(new Error(`Authentication error: ${message}`));
  }
}
