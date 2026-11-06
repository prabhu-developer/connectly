import type { Server, Socket } from "socket.io";
import {
  SOCKET_EVENTS,
  type PresenceChangePayload,
  type PresenceSyncPayload,
  type TypingPayload,
  type SendMessageSocketPayload,
  type MessageAckPayload,
  type MessageNewPayload,
  type ConversationReadSocketPayload,
  type ConversationReadUpdatePayload,
  type MessageStatusUpdatePayload,
} from "@repo/contracts/socket";
import { presenceService } from "../services/presence.service.js";
import { messageService } from "../services/message.service.js";
import { readCursorService } from "../services/read-cursor.service.js";
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
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

    // 7. Real-Time Message Sending with Idempotency & Delivery Tracking
    socket.on(
      SOCKET_EVENTS.MESSAGE_SEND,
      async (data: SendMessageSocketPayload, callback?: (ack: MessageAckPayload) => void) => {
        try {
          if (!data?.conversationId || (!data?.content?.trim() && !data?.attachment)) {
            const errPayload: MessageAckPayload = {
              success: false,
              error: "conversationId and either content or attachment are required",
            };
            if (typeof callback === "function") callback(errPayload);
            return;
          }

          // Persist message first via transport-independent domain service
          const message = await messageService.createMessage({
            conversationId: data.conversationId,
            senderId: user.id,
            content: data.content,
            attachment: data.attachment,
            clientTempId: data.clientTempId,
          });

          // Acknowledge back to sender
          const ackPayload: MessageAckPayload = {
            success: true,
            message,
          };
          if (typeof callback === "function") {
            callback(ackPayload);
          }
          socket.emit(SOCKET_EVENTS.MESSAGE_ACK, ackPayload);

          // Find the recipient in the conversation
          const conv = await Conversation.findById(data.conversationId).lean();
          const recipientId = conv?.participants
            .find((p) => p.toString() !== user.id)
            ?.toString();

          const newMsgPayload: MessageNewPayload = { message };

          // Broadcast to conversation room and to recipient's personal room (union without duplicate delivery)
          const messageTarget = socket.to(`conversation:${data.conversationId}`);
          if (recipientId) {
            messageTarget.to(`user:${recipientId}`);
          }
          messageTarget.emit(SOCKET_EVENTS.MESSAGE_NEW, newMsgPayload);

          // If recipient has active connections, mark message as delivered
          if (recipientId && presenceService.isUserOnline(recipientId)) {
            await Message.findByIdAndUpdate(message.id, { status: "delivered" });
            message.status = "delivered";

            const statusPayload: MessageStatusUpdatePayload = {
              conversationId: data.conversationId,
              messageId: message.id,
              status: "delivered",
            };

            io.to(`conversation:${data.conversationId}`).emit(
              SOCKET_EVENTS.MESSAGE_STATUS_UPDATE,
              statusPayload
            );
            io.to(`user:${user.id}`).emit(
              SOCKET_EVENTS.MESSAGE_STATUS_UPDATE,
              statusPayload
            );
          }
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : "Failed to send message";
          logger.warn({ socketId: socket.id, err }, "Socket message send error");
          const errPayload: MessageAckPayload = {
            success: false,
            error: errorMessage,
          };
          if (typeof callback === "function") callback(errPayload);
        }
      }
    );

    // 8. Real-Time Read Cursor Synchronization
    socket.on(
      SOCKET_EVENTS.CONVERSATION_READ,
      async (data: ConversationReadSocketPayload, callback?: (ack: { success: boolean }) => void) => {
        try {
          if (!data?.conversationId || !data?.messageId) return;

          await readCursorService.updateReadCursor(
            data.conversationId,
            user.id,
            data.messageId
          );

          const readPayload: ConversationReadUpdatePayload = {
            conversationId: data.conversationId,
            userId: user.id,
            messageId: data.messageId,
          };

          const conv = await Conversation.findById(data.conversationId).lean();
          const recipientId = conv?.participants
            .find((p) => p.toString() !== user.id)
            ?.toString();

          // Broadcast to conversation room and to the other participant's personal room without duplicate delivery
          const readTarget = socket.to(`conversation:${data.conversationId}`);
          if (recipientId) {
            readTarget.to(`user:${recipientId}`);
          }
          readTarget.emit(SOCKET_EVENTS.CONVERSATION_READ_UPDATE, readPayload);

          if (typeof callback === "function") callback({ success: true });
        } catch (err: unknown) {
          logger.warn({ socketId: socket.id, err }, "Socket conversation read update error");
          if (typeof callback === "function") callback({ success: false });
        }
      }
    );

    // 9. Disconnection & Multi-session Last Seen Persistence
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
