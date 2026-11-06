import { Types } from "mongoose";
import { User, type UserDocument } from "../models/user.model.js";
import { AppError } from "../middleware/error.middleware.js";
import type {
  UpdateProfileInput,
  UpdateSettingsInput,
  UserProfileDto,
  PublicUserProfileDto,
  UserSettingsDto,
} from "@repo/contracts/user";

function mapToUserProfileDto(user: UserDocument): UserProfileDto {
  return {
    id: user._id.toString(),
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    settings: user.settings
      ? {
          soundEnabled: user.settings.soundEnabled ?? true,
          enterToSend: user.settings.enterToSend ?? true,
          desktopNotifications: user.settings.desktopNotifications ?? false,
          theme: user.settings.theme ?? "system",
        }
      : {
          soundEnabled: true,
          enterToSend: true,
          desktopNotifications: false,
          theme: "system",
        },
    lastSeenAt: user.lastSeenAt ? user.lastSeenAt.toISOString() : undefined,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function mapToPublicProfileDto(user: UserDocument): PublicUserProfileDto {
  return {
    id: user._id.toString(),
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    lastSeenAt: user.lastSeenAt ? user.lastSeenAt.toISOString() : undefined,
  };
}

export class UserService {
  /**
   * Retrieves a full user profile by user ID.
   */
  async getUserProfile(userId: string): Promise<UserProfileDto> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new AppError("Invalid user ID", 400, "INVALID_ID");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    return mapToUserProfileDto(user);
  }

  /**
   * Updates an existing user's profile details.
   */
  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfileDto> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new AppError("Invalid user ID", 400, "INVALID_ID");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    if (input.displayName !== undefined) {
      user.displayName = input.displayName.trim();
    }

    if (input.bio !== undefined) {
      user.bio = input.bio.trim();
    }

    if (input.avatarUrl !== undefined) {
      user.avatarUrl = input.avatarUrl ? input.avatarUrl.trim() : undefined;
    }

    await user.save();
    return mapToUserProfileDto(user);
  }

  /**
   * Retrieves another user's public profile.
   */
  async getPublicProfile(targetUserId: string): Promise<PublicUserProfileDto> {
    if (!Types.ObjectId.isValid(targetUserId)) {
      throw new AppError("Invalid user ID", 400, "INVALID_ID");
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    return mapToPublicProfileDto(user);
  }

  /**
   * Retrieves a user's notification and chat settings.
   */
  async getSettings(userId: string): Promise<UserSettingsDto> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new AppError("Invalid user ID", 400, "INVALID_ID");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    return {
      soundEnabled: user.settings?.soundEnabled ?? true,
      enterToSend: user.settings?.enterToSend ?? true,
      desktopNotifications: user.settings?.desktopNotifications ?? false,
      theme: user.settings?.theme ?? "system",
    };
  }

  /**
   * Updates a user's notification and chat settings.
   */
  async updateSettings(userId: string, input: UpdateSettingsInput): Promise<UserSettingsDto> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new AppError("Invalid user ID", 400, "INVALID_ID");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    if (!user.settings) {
      user.settings = {
        soundEnabled: true,
        enterToSend: true,
        desktopNotifications: false,
        theme: "system",
      };
    }

    if (input.soundEnabled !== undefined) user.settings.soundEnabled = input.soundEnabled;
    if (input.enterToSend !== undefined) user.settings.enterToSend = input.enterToSend;
    if (input.desktopNotifications !== undefined) {
      user.settings.desktopNotifications = input.desktopNotifications;
    }
    if (input.theme !== undefined) user.settings.theme = input.theme;

    await user.save();
    return {
      soundEnabled: user.settings.soundEnabled,
      enterToSend: user.settings.enterToSend,
      desktopNotifications: user.settings.desktopNotifications,
      theme: user.settings.theme,
    };
  }
}

export const userService = new UserService();
