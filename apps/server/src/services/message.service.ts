import { Types } from "mongoose";
import { Message, type MessageDocument } from "../models/message.model.js";
import { Conversation } from "../models/conversation.model.js";
import { conversationService } from "./conversation.service.js";
import { AppError } from "../middleware/error.middleware.js";
import type { MessageDto, PaginatedMessagesDto } from "@repo/contracts/chat";

export interface CreateMessageParams {
  conversationId: string;
  senderId: string;
  content: string;
  clientTempId?: string;
}

export interface GetMessagesParams {
  conversationId: string;
  currentUserId: string;
  cursor?: string;
  limit?: number;
}

function mapMessageToDto(doc: MessageDocument): MessageDto {
  return {
    id: doc._id.toString(),
    conversationId: doc.conversationId.toString(),
    senderId: doc.senderId.toString(),
    content: doc.content,
    status: doc.status,
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
    if (!trimmedContent) {
      throw new AppError("Message content cannot be empty", 400, "EMPTY_MESSAGE");
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
}

export const messageService = new MessageService();
