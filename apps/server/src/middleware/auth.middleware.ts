import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/token.utils.js";
import { AppError } from "./error.middleware.js";

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

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError("Authentication required", 401, "UNAUTHORIZED");
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    throw new AppError("Authentication token is missing", 401, "UNAUTHORIZED");
  }

  const payload = verifyAccessToken(token);

  req.user = {
    id: payload.sub,
    email: payload.email,
    username: payload.username,
  };

  next();
}

