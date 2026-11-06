import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, hashToken } from "../utils/token.utils.js";
import { AppError } from "./error.middleware.js";
import { REFRESH_COOKIE_NAME, ACCESS_COOKIE_NAME } from "../controllers/auth.controller.js";
import { RefreshSession } from "../models/refresh-session.model.js";
import { User } from "../models/user.model.js";

// Augment Express Request type with authenticated user payload
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
      };
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    let token: string | undefined;

    // 1. Authorization header: "Bearer <token>"
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }

    // 2. Cookie token: connectly_access or accessToken
    if (!token && (req.cookies || req.signedCookies)) {
      token =
        req.cookies?.[ACCESS_COOKIE_NAME] ||
        req.cookies?.accessToken ||
        req.signedCookies?.[ACCESS_COOKIE_NAME] ||
        req.signedCookies?.accessToken;
    }

    // 3. Query string token: ?token=<token>
    if (!token && typeof req.query?.token === "string") {
      token = req.query.token.trim();
    }

    // If an access token was provided via header, cookie, or query, verify it
    if (token) {
      try {
        const payload = verifyAccessToken(token);
        req.user = {
          id: payload.sub,
          email: payload.email,
          username: payload.username,
        };
        return next();
      } catch (tokenErr) {
        // If an explicit Authorization header or query token was provided and no refresh cookie exists, fail immediately
        const hasRefreshCookie = Boolean(
          req.cookies?.[REFRESH_COOKIE_NAME] || req.signedCookies?.[REFRESH_COOKIE_NAME]
        );
        if (!hasRefreshCookie) {
          return next(tokenErr);
        }
      }
    }

    // 4. Session cookie fallback: connectly_refresh
    const rawRefreshToken =
      req.cookies?.[REFRESH_COOKIE_NAME] || req.signedCookies?.[REFRESH_COOKIE_NAME];
    if (rawRefreshToken && typeof rawRefreshToken === "string") {
      try {
        const incomingHash = hashToken(rawRefreshToken);
        const session = await RefreshSession.findOne({
          tokenHash: incomingHash,
          isRevoked: false,
          expiresAt: { $gt: new Date() },
        });

        if (session) {
          const user = await User.findById(session.userId);
          if (user) {
            req.user = {
              id: user._id.toString(),
              email: user.email,
              username: user.username,
            };
            return next();
          }
        }
      } catch {
        // Fall through to 401 on DB connection issue or session not found
      }
    }

    return next(new AppError("Authentication required", 401, "UNAUTHORIZED"));
  } catch (err) {
    return next(err);
  }
}
