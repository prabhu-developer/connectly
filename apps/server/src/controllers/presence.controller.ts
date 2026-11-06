import type { Request, Response, NextFunction } from "express";
import { presenceService } from "../services/presence.service.js";
import { AppError } from "../middleware/error.middleware.js";

export async function getUserPresence(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawUserId = req.params.userId;
    const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
    if (!userId) {
      throw new AppError("User ID is required", 400, "MISSING_PARAM");
    }

    const presence = await presenceService.getUserPresence(userId);

    res.status(200).json({
      success: true,
      data: {
        userId,
        isOnline: presence.isOnline,
        lastSeenAt: presence.lastSeenAt ? presence.lastSeenAt.toISOString() : null,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getBatchPresence(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawIds = req.query.userIds;
    if (!rawIds || typeof rawIds !== "string") {
      throw new AppError("userIds query parameter is required (comma-separated)", 400, "INVALID_QUERY");
    }

    const userIds = rawIds
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    const presenceMap = await presenceService.getUsersPresence(userIds);

    // Format dates to ISO strings for API serialization
    const formattedData: Record<string, { isOnline: boolean; lastSeenAt: string | null }> = {};
    for (const [id, val] of Object.entries(presenceMap)) {
      formattedData[id] = {
        isOnline: val.isOnline,
        lastSeenAt: val.lastSeenAt ? val.lastSeenAt.toISOString() : null,
      };
    }

    res.status(200).json({
      success: true,
      data: {
        users: formattedData,
      },
    });
  } catch (err) {
    next(err);
  }
}
