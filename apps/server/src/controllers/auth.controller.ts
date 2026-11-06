import type { Request, Response, NextFunction } from "express";
import { registerSchema, loginSchema, type AuthResponseData, type AuthUserDto } from "@repo/contracts/auth";
import type { ApiResponse } from "@repo/contracts/api";
import { authService } from "../services/auth.service.js";
import { env } from "../config/env.js";
import { AppError } from "../middleware/error.middleware.js";

export const REFRESH_COOKIE_NAME = "connectly_refresh";

const getCookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

export async function handleRegister(
  req: Request,
  res: Response<ApiResponse<AuthResponseData>>,
  next: NextFunction
): Promise<void> {
  try {
    const validatedInput = registerSchema.parse(req.body);

    const result = await authService.register(validatedInput, {
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getCookieOptions());

    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleLogin(
  req: Request,
  res: Response<ApiResponse<AuthResponseData>>,
  next: NextFunction
): Promise<void> {
  try {
    const validatedInput = loginSchema.parse(req.body);

    const result = await authService.login(validatedInput, {
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getCookieOptions());

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleRefresh(
  req: Request,
  res: Response<ApiResponse<AuthResponseData>>,
  next: NextFunction
): Promise<void> {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!rawRefreshToken) {
      throw new AppError("No refresh token provided", 401, "REFRESH_TOKEN_REQUIRED");
    }

    const result = await authService.refresh(rawRefreshToken, {
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getCookieOptions());

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (err) {
    // If refresh fails, ensure stale cookie is cleared
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
    next(err);
  }
}

export async function handleLogout(
  req: Request,
  res: Response<ApiResponse<{ message: string }>>,
  next: NextFunction
): Promise<void> {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    await authService.logout(rawRefreshToken);

    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });

    res.status(200).json({
      success: true,
      data: {
        message: "Logged out successfully",
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleGetMe(
  req: Request,
  res: Response<ApiResponse<AuthUserDto>>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const user = await authService.getMe(req.user.id);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
}

