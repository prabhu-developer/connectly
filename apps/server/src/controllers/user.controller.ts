import type { Request, Response, NextFunction } from "express";
import { userSearchQuerySchema } from "@repo/contracts/chat";
import { updateProfileSchema } from "@repo/contracts/user";
import { userSearchService } from "../services/user-search.service.js";
import { userService } from "../services/user.service.js";
import { AppError } from "../middleware/error.middleware.js";

export async function searchUsers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parseResult = userSearchQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      throw new AppError(
        parseResult.error.errors[0]?.message || "Invalid search query",
        400,
        "VALIDATION_ERROR"
      );
    }

    const { q, limit } = parseResult.data;
    const userId = req.user!.id;

    const results = await userSearchService.searchUsers(q, userId, limit);

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (err) {
    next(err);
  }
}

export async function getProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const profile = await userService.getUserProfile(userId);

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const parseResult = updateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError(
        parseResult.error.errors[0]?.message || "Invalid profile data",
        400,
        "VALIDATION_ERROR"
      );
    }

    const updated = await userService.updateProfile(userId, parseResult.data);

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

export async function getUserById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawId = req.params.id;
    const targetUserId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!targetUserId) {
      throw new AppError("User ID is required", 400, "INVALID_ID");
    }

    const publicProfile = await userService.getPublicProfile(targetUserId);

    res.status(200).json({
      success: true,
      data: publicProfile,
    });
  } catch (err) {
    next(err);
  }
}
