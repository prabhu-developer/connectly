import bcryptjs from "bcryptjs";
import type { RegisterInput, LoginInput, AuthUserDto, AuthResponseData } from "@repo/contracts/auth";
import { User, type UserDocument } from "../models/user.model.js";
import { RefreshSession } from "../models/refresh-session.model.js";
import { AppError } from "../middleware/error.middleware.js";
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTokenExpiry,
} from "../utils/token.utils.js";
import { logger } from "../config/logger.js";

export interface SessionContext {
  userAgent?: string;
  ipAddress?: string;
}

export interface AuthTokensResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUserDto;
}

function mapUserToDto(user: UserDocument): AuthUserDto {
  return {
    id: user._id.toString(),
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    createdAt: user.createdAt.toISOString(),
  };
}

export class AuthService {
  /**
   * Register a new user and create an initial session.
   */
  async register(input: RegisterInput, context?: SessionContext): Promise<AuthTokensResult> {
    const existingEmail = await User.findOne({ email: input.email });
    if (existingEmail) {
      throw new AppError("An account with this email already exists", 409, "EMAIL_EXISTS");
    }

    const existingUsername = await User.findOne({ username: input.username });
    if (existingUsername) {
      throw new AppError("This username is already taken", 409, "USERNAME_EXISTS");
    }

    const passwordHash = await bcryptjs.hash(input.password, 10);

    const user = await User.create({
      email: input.email,
      username: input.username,
      displayName: input.displayName,
      passwordHash,
    });

    const accessToken = signAccessToken({
      sub: user._id.toString(),
      email: user.email,
      username: user.username,
    });

    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);

    await RefreshSession.create({
      userId: user._id,
      tokenHash,
      isRevoked: false,
      userAgent: context?.userAgent,
      ipAddress: context?.ipAddress,
      expiresAt: getRefreshTokenExpiry(),
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: mapUserToDto(user),
    };
  }

  /**
   * Authenticate a user by email or username and create a new session.
   */
  async login(input: LoginInput, context?: SessionContext): Promise<AuthTokensResult> {
    const identifier = input.identifier.toLowerCase();

    // Find by either email or username; explicitly select passwordHash
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    }).select("+passwordHash");

    if (!user) {
      throw new AppError("Invalid email/username or password", 401, "INVALID_CREDENTIALS");
    }

    const isMatch = await bcryptjs.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError("Invalid email/username or password", 401, "INVALID_CREDENTIALS");
    }

    const accessToken = signAccessToken({
      sub: user._id.toString(),
      email: user.email,
      username: user.username,
    });

    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);

    await RefreshSession.create({
      userId: user._id,
      tokenHash,
      isRevoked: false,
      userAgent: context?.userAgent,
      ipAddress: context?.ipAddress,
      expiresAt: getRefreshTokenExpiry(),
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: mapUserToDto(user),
    };
  }

  /**
   * Rotate refresh token and issue a new access token.
   * Performs explicit expiration, revocation, and token-reuse breach detection.
   */
  async refresh(rawRefreshToken: string, context?: SessionContext): Promise<AuthTokensResult> {
    if (!rawRefreshToken) {
      throw new AppError("Refresh token is required", 401, "REFRESH_TOKEN_REQUIRED");
    }

    const incomingHash = hashToken(rawRefreshToken);
    const session = await RefreshSession.findOne({ tokenHash: incomingHash });

    if (!session) {
      throw new AppError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    // Token Reuse / Breach Detection:
    // If a session has already been revoked and someone tries to reuse it, revoke all active sessions for this user!
    if (session.isRevoked) {
      logger.warn(
        { userId: session.userId },
        "🚨 Security alert: Revoked refresh token reuse detected! Revoking all sessions for user."
      );
      await RefreshSession.updateMany({ userId: session.userId }, { isRevoked: true });
      throw new AppError("Session invalidated due to suspicious activity", 401, "SESSION_REVOKED");
    }

    // Explicit application-level expiration check (never rely on asynchronous MongoDB TTL alone)
    if (session.expiresAt <= new Date()) {
      session.isRevoked = true;
      await session.save();
      throw new AppError("Refresh token has expired", 401, "REFRESH_TOKEN_EXPIRED");
    }

    const user = await User.findById(session.userId);
    if (!user) {
      throw new AppError("User associated with session not found", 404, "USER_NOT_FOUND");
    }

    // Rotate token: revoke current session
    session.isRevoked = true;
    await session.save();

    // Create fresh session with new token
    const newRawRefreshToken = generateRefreshToken();
    const newTokenHash = hashToken(newRawRefreshToken);

    await RefreshSession.create({
      userId: user._id,
      tokenHash: newTokenHash,
      isRevoked: false,
      userAgent: context?.userAgent || session.userAgent,
      ipAddress: context?.ipAddress || session.ipAddress,
      expiresAt: getRefreshTokenExpiry(),
    });

    const accessToken = signAccessToken({
      sub: user._id.toString(),
      email: user.email,
      username: user.username,
    });

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
      user: mapUserToDto(user),
    };
  }

  /**
   * Log out by revoking the refresh session.
   */
  async logout(rawRefreshToken?: string): Promise<void> {
    if (!rawRefreshToken) {
      return;
    }
    const tokenHash = hashToken(rawRefreshToken);
    await RefreshSession.updateOne({ tokenHash }, { isRevoked: true });
  }

  /**
   * Get user profile by userId.
   */
  async getMe(userId: string): Promise<AuthUserDto> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }
    return mapUserToDto(user);
  }
}

export const authService = new AuthService();

