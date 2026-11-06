import type { Request, Response, NextFunction } from "express";
import { userSearchQuerySchema } from "@repo/contracts/chat";
import { userSearchService } from "../services/user-search.service.js";
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
