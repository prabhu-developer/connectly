import { Types } from "mongoose";
import { User, type UserDocument } from "../models/user.model.js";
import { AppError } from "../middleware/error.middleware.js";
import type { UserSearchResultDto } from "@repo/contracts/chat";

export class UserSearchService {
  /**
   * Searches users by username or displayName, excluding the requesting user.
   */
  async searchUsers(
    query: string,
    currentUserId: string,
    limit = 20
  ): Promise<UserSearchResultDto[]> {
    const trimmed = query?.trim() || "";
    if (!trimmed) {
      return [];
    }

    if (!Types.ObjectId.isValid(currentUserId)) {
      throw new AppError("Invalid user ID", 400, "INVALID_ID");
    }

    const safeLimit = Math.min(Math.max(limit, 1), 50);
    // Escape regex special characters to prevent ReDoS
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    const users = await User.find({
      _id: { $ne: new Types.ObjectId(currentUserId) },
      $or: [{ username: regex }, { displayName: regex }],
    })
      .limit(safeLimit)
      .select("_id username displayName avatarUrl bio")
      .lean<UserDocument[]>();

    return users.map((u) => ({
      id: u._id.toString(),
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      bio: u.bio,
    }));
  }
}

export const userSearchService = new UserSearchService();
