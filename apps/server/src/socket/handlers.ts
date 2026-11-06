import type { Server, Socket } from "socket.io";
import {
  SOCKET_EVENTS,
  type PresenceChangePayload,
  type PresenceSyncPayload,
  type TypingPayload,
} from "@repo/contracts/socket";
import { presenceService } from "../services/presence.service.js";
import { logger } from "../config/logger.js";

export function registerSocketHandlers(io: Server): void {
  io.on(SOCKET_EVENTS.CONNECT, (socket: Socket) => {
    const user = socket.data.user;
    if (!user) {
      socket.disconnect(true);
      return;
    }

    // 1. Join user personal room for private targeted events (e.g., message notifications)
    socket.join(`user:${user.id}`);

    // 2. Track connection in presence service
    const { isFirstConnection } = presenceService.addConnection(user.id, socket.id);

    // 3. Broadcast online status if this is the user's first active tab/device
    if (isFirstConnection) {
      const payload: PresenceChangePayload = {
        userId: user.id,
        isOnline: true,
      };
      io.emit(SOCKET_EVENTS.PRESENCE_CHANGE, payload);
    }

    // 4. Send initial sync of all currently online users to the newly connected socket
    const syncPayload: PresenceSyncPayload = {
      onlineUserIds: presenceService.getOnlineUserIds(),
    };
    socket.emit(SOCKET_EVENTS.PRESENCE_SYNC, syncPayload);

    // 5. Conversation Room Joining / Leaving
    socket.on(
      SOCKET_EVENTS.CONVERSATION_JOIN,
      (data: { conversationId: string }, callback?: (ack: { success: boolean }) => void) => {
        if (data?.conversationId) {
          const room = `conversation:${data.conversationId}`;
          socket.join(room);
          logger.debug({ socketId: socket.id, userId: user.id, room }, "Joined conversation room");
          if (typeof callback === "function") callback({ success: true });
        }
      }
    );

    socket.on(
      SOCKET_EVENTS.CONVERSATION_LEAVE,
      (data: { conversationId: string }, callback?: (ack: { success: boolean }) => void) => {
        if (data?.conversationId) {
          const room = `conversation:${data.conversationId}`;
          socket.leave(room);
          logger.debug({ socketId: socket.id, userId: user.id, room }, "Left conversation room");
          if (typeof callback === "function") callback({ success: true });
        }
      }
    );

    // 6. Real-time Typing Indicators
    socket.on(SOCKET_EVENTS.TYPING_START, (data: { conversationId: string }) => {
      if (!data?.conversationId) return;
      const room = `conversation:${data.conversationId}`;
      const payload: TypingPayload = {
        conversationId: data.conversationId,
        userId: user.id,
        username: user.username,
      };
      socket.to(room).emit(SOCKET_EVENTS.TYPING_START, payload);
    });

    socket.on(SOCKET_EVENTS.TYPING_STOP, (data: { conversationId: string }) => {
      if (!data?.conversationId) return;
      const room = `conversation:${data.conversationId}`;
      const payload: TypingPayload = {
        conversationId: data.conversationId,
        userId: user.id,
        username: user.username,
      };
      socket.to(room).emit(SOCKET_EVENTS.TYPING_STOP, payload);
    });

    // 7. Disconnection & Multi-session Last Seen Persistence
    socket.on(SOCKET_EVENTS.DISCONNECT, async (reason: string) => {
      logger.debug(
        { socketId: socket.id, userId: user.id, reason },
        "Socket disconnected"
      );

      const result = await presenceService.removeConnection(socket.id);
      if (result?.isLastConnection) {
        const payload: PresenceChangePayload = {
          userId: result.userId,
          isOnline: false,
          lastSeenAt: result.lastSeenAt?.toISOString(),
        };
        io.emit(SOCKET_EVENTS.PRESENCE_CHANGE, payload);
      }
    });
  });
}
