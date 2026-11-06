import path from "node:path";
import { Types } from "mongoose";
import { Message, type MessageDocument } from "../models/message.model.js";
import { Conversation } from "../models/conversation.model.js";
import { Media } from "../models/media.model.js";
import { conversationService } from "./conversation.service.js";
import { AppError } from "../middleware/error.middleware.js";
import { getSocketServer } from "../socket/index.js";
import { SOCKET_EVENTS } from "@repo/contracts/socket";
import type {
  AttachmentDto,
  MessageDto,
  MessageSearchResultDto,
  PaginatedMessagesDto,
} from "@repo/contracts/chat";

export interface CreateMessageParams {
  conversationId: string;
  senderId: string;
  content?: string;
  attachment?: AttachmentDto;
  clientTempId?: string;
}

export interface GetMessagesParams {
  conversationId: string;
  currentUserId: string;
  cursor?: string;
  limit?: number;
}

export interface DeleteMessageParams {
  conversationId: string;
  messageId: string;
  userId: string;
}

function mapMessageToDto(doc: MessageDocument): MessageDto {
  return {
    id: doc._id.toString(),
    conversationId: doc.conversationId.toString(),
    senderId: doc.senderId.toString(),
    content: doc.content,
    status: doc.status,
    attachment: doc.attachment
      ? {
          url: doc.attachment.url,
          type: doc.attachment.type,
          name: doc.attachment.name,
          size: doc.attachment.size,
          mimeType: doc.attachment.mimeType,
        }
      : undefined,
    clientTempId: doc.clientTempId,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export class MessageService {
  /**
   * Persists a new message with idempotency enforcement.
   */
  async createMessage(params: CreateMessageParams): Promise<MessageDto> {
    const trimmedContent = params.content?.trim() || "";
    if (!trimmedContent && !params.attachment) {
      throw new AppError("Message content or attachment is required", 400, "EMPTY_MESSAGE");
    }

    if (trimmedContent.length > 5000) {
      throw new AppError("Message content exceeds 5000 characters", 400, "MESSAGE_TOO_LONG");
    }

    // Verify sender is participant in the conversation
    await conversationService.verifyParticipant(params.conversationId, params.senderId);

    // Idempotency: Check if clientTempId already exists from this sender
    if (params.clientTempId) {
      const existing = await Message.findOne({
        conversationId: new Types.ObjectId(params.conversationId),
        senderId: new Types.ObjectId(params.senderId),
        clientTempId: params.clientTempId,
      });

      if (existing) {
        return mapMessageToDto(existing);
      }
    }

    try {
      const message = await Message.create({
        conversationId: new Types.ObjectId(params.conversationId),
        senderId: new Types.ObjectId(params.senderId),
        content: trimmedContent,
        attachment: params.attachment,
        clientTempId: params.clientTempId || undefined,
        status: "sent",
      });

      // Update conversation metadata
      await Conversation.findByIdAndUpdate(params.conversationId, {
        lastMessageId: message._id,
        lastMessageAt: message.createdAt,
      });

      return mapMessageToDto(message);
    } catch (err: unknown) {
      // Catch concurrent duplicate key race conditions
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: number }).code === 11000 &&
        params.clientTempId
      ) {
        const existing = await Message.findOne({
          conversationId: new Types.ObjectId(params.conversationId),
          senderId: new Types.ObjectId(params.senderId),
          clientTempId: params.clientTempId,
        });

        if (existing) {
          return mapMessageToDto(existing);
        }
      }
      throw err;
    }
  }

  /**
   * Retrieves messages for a conversation with cursor pagination.
   */
  async getConversationMessages(params: GetMessagesParams): Promise<PaginatedMessagesDto> {
    await conversationService.verifyParticipant(params.conversationId, params.currentUserId);

    const limit = Math.min(Math.max(params.limit || 50, 1), 100);
    const query: Record<string, unknown> = {
      conversationId: new Types.ObjectId(params.conversationId),
    };

    if (params.cursor) {
      if (!Types.ObjectId.isValid(params.cursor)) {
        throw new AppError("Invalid cursor format", 400, "INVALID_CURSOR");
      }

      const cursorMsg = await Message.findById(params.cursor);
      if (cursorMsg) {
        query.createdAt = { $lt: cursorMsg.createdAt };
      }
    }

    // Fetch limit + 1 to check if there are more older messages
    const docs = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1);

    const hasMore = docs.length > limit;
    if (hasMore) {
      docs.pop();
    }

    // Next cursor is the oldest message id in this batch
    const nextCursor = hasMore && docs.length > 0 ? docs[docs.length - 1]?._id.toString() || null : null;

    // Return in chronological order (oldest to newest)
    const chronologicalDocs = docs.reverse();

    return {
      messages: chronologicalDocs.map(mapMessageToDto),
      nextCursor,
      hasMore,
    };
  }

  /**
   * Searches messages within a conversation matching a text query.
   */
  async searchMessages(params: {
    currentUserId: string;
    conversationId: string;
    query: string;
    limit?: number;
  }): Promise<MessageSearchResultDto[]> {
    await conversationService.verifyParticipant(params.conversationId, params.currentUserId);

    const trimmed = params.query?.trim() || "";
    if (!trimmed) {
      return [];
    }

    const safeLimit = Math.min(Math.max(params.limit || 20, 1), 50);
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    const docs = await Message.find({
      conversationId: new Types.ObjectId(params.conversationId),
      content: regex,
    })
      .sort({ createdAt: -1 })
      .limit(safeLimit);

    return docs.map((doc) => ({
      message: mapMessageToDto(doc),
      matchSnippet: doc.content.length > 100 ? `${doc.content.slice(0, 100)}...` : doc.content,
    }));
  }

  /**
   * Deletes a message (including file/image attachment cleanup) and updates conversation last message.
   */
  async deleteMessage(params: DeleteMessageParams): Promise<void> {
    if (!Types.ObjectId.isValid(params.conversationId) || !Types.ObjectId.isValid(params.messageId)) {
      throw new AppError("Invalid ID format", 400, "INVALID_ID");
    }

    // Verify user is an authorized participant in the conversation
    await conversationService.verifyParticipant(params.conversationId, params.userId);

    const message = await Message.findById(params.messageId);
    if (!message || message.conversationId.toString() !== params.conversationId) {
      throw new AppError("Message not found", 404, "MESSAGE_NOT_FOUND");
    }

    // Only sender is authorized to delete the message
    if (message.senderId.toString() !== params.userId) {
      throw new AppError("You can only delete your own messages", 403, "FORBIDDEN");
    }

    // If message contains an attachment, clean up its Media record
    if (message.attachment?.url) {
      const filename = path.basename(message.attachment.url.split("?")[0] || "");
      if (filename) {
        await Media.deleteOne({ filename });
      }
    }

    await Message.findByIdAndDelete(params.messageId);

    // If this was the lastMessageId on the conversation, update to the previous newest message
    const conv = await Conversation.findById(params.conversationId);
    if (conv && conv.lastMessageId?.toString() === params.messageId) {
      const remainingNewest = await Message.findOne({
        conversationId: new Types.ObjectId(params.conversationId),
      }).sort({ createdAt: -1 });

      conv.lastMessageId = (remainingNewest?._id as unknown as Types.ObjectId) || undefined;
      conv.lastMessageAt = remainingNewest?.createdAt || conv.createdAt;
      await conv.save();
    }

    // Broadcast deletion in real-time
    const io = getSocketServer();
    if (io) {
      io.to(`conversation:${params.conversationId}`).emit(SOCKET_EVENTS.MESSAGE_DELETE, {
        conversationId: params.conversationId,
        messageId: params.messageId,
      });
    }
  }
}

export const messageService = new MessageService();
