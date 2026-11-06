import { User } from "../models/user.model.js";
import { logger } from "../config/logger.js";

export interface UserPresenceResult {
  isOnline: boolean;
  lastSeenAt?: Date | null;
}

export class PresenceService {
  private userSockets: Map<string, Set<string>> = new Map();
  private socketToUser: Map<string, string> = new Map();

  /**
   * Registers a socket connection for a user.
   * Returns whether this is the user's first active connection.
   */
  addConnection(userId: string, socketId: string): { isFirstConnection: boolean; totalConnections: number } {
    let sockets = this.userSockets.get(userId);
    const isFirstConnection = !sockets || sockets.size === 0;

    if (!sockets) {
      sockets = new Set<string>();
      this.userSockets.set(userId, sockets);
    }

    sockets.add(socketId);
    this.socketToUser.set(socketId, userId);

    logger.debug(
      { userId, socketId, totalUserConnections: sockets.size, isFirstConnection },
      "Socket connection registered in presence tracker"
    );

    return { isFirstConnection, totalConnections: sockets.size };
  }

  /**
   * Unregisters a socket connection.
   * When the final socket for a user disconnects, updates their lastSeenAt in the database.
   */
  async removeConnection(
    socketId: string
  ): Promise<{ userId: string; isLastConnection: boolean; lastSeenAt?: Date } | null> {
    const userId = this.socketToUser.get(socketId);
    if (!userId) {
      return null;
    }

    this.socketToUser.delete(socketId);
    const sockets = this.userSockets.get(userId);

    if (!sockets) {
      return null;
    }

    sockets.delete(socketId);

    if (sockets.size === 0) {
      this.userSockets.delete(userId);
      const lastSeenAt = new Date();

      try {
        await User.findByIdAndUpdate(userId, { lastSeenAt }).exec();
      } catch (err) {
        logger.error({ err, userId }, "Failed to persist lastSeenAt on final disconnect");
      }

      logger.debug(
        { userId, socketId, lastSeenAt },
        "User completely disconnected; persisted lastSeenAt"
      );

      return { userId, isLastConnection: true, lastSeenAt };
    }

    logger.debug(
      { userId, socketId, remainingConnections: sockets.size },
      "Socket disconnected, but user still has active connections"
    );

    return { userId, isLastConnection: false };
  }

  /**
   * Checks whether a user currently has any active socket connections.
   */
  isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return !!sockets && sockets.size > 0;
  }

  /**
   * Returns an array of all currently online user IDs.
   */
  getOnlineUserIds(): string[] {
    return Array.from(this.userSockets.keys());
  }

  /**
   * Retrieves presence for a specific user.
   */
  async getUserPresence(userId: string): Promise<UserPresenceResult> {
    if (this.isUserOnline(userId)) {
      return { isOnline: true };
    }

    const user = await User.findById(userId, "lastSeenAt").lean().exec();
    return {
      isOnline: false,
      lastSeenAt: user?.lastSeenAt ?? null,
    };
  }

  /**
   * Retrieves presence for multiple users efficiently.
   */
  async getUsersPresence(userIds: string[]): Promise<Record<string, UserPresenceResult>> {
    const result: Record<string, UserPresenceResult> = {};
    const offlineUserIds: string[] = [];

    for (const id of userIds) {
      if (this.isUserOnline(id)) {
        result[id] = { isOnline: true };
      } else {
        offlineUserIds.push(id);
      }
    }

    if (offlineUserIds.length > 0) {
      const offlineUsers = await User.find(
        { _id: { $in: offlineUserIds } },
        "_id lastSeenAt"
      ).lean().exec();

      for (const u of offlineUsers) {
        result[u._id.toString()] = {
          isOnline: false,
          lastSeenAt: u.lastSeenAt ?? null,
        };
      }

      // Default any unfound IDs
      for (const id of offlineUserIds) {
        if (!result[id]) {
          result[id] = { isOnline: false, lastSeenAt: null };
        }
      }
    }

    return result;
  }

  /**
   * Clears all in-memory connections (primarily for testing).
   */
  reset(): void {
    this.userSockets.clear();
    this.socketToUser.clear();
  }
}

export const presenceService = new PresenceService();
