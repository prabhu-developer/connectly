import { Types } from "mongoose";
import { Conversation, type ConversationDocument, createParticipantKey } from "../models/conversation.model.js";
import { Message, type MessageDocument } from "../models/message.model.js";
import { User, type UserDocument } from "../models/user.model.js";
import { AppError } from "../middleware/error.middleware.js";
import type { ConversationDto, ConversationParticipantDto, LastMessageDto } from "@repo/contracts/chat";

export interface PopulatedConversationDoc {
  _id: Types.ObjectId;
  participants: UserDocument[];
  lastMessageId?: MessageDocument;
  readCursors: Array<{
    userId: Types.ObjectId;
    lastReadMessageId: Types.ObjectId;
    readAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export class ConversationService {
  /**
   * Finds an existing 1-to-1 conversation or creates a new one deterministically.
   */
  async findOrCreateConversation(
    userIdA: string,
    userIdB: string
  ): Promise<ConversationDto> {
    if (!Types.ObjectId.isValid(userIdA) || !Types.ObjectId.isValid(userIdB)) {
      throw new AppError("Invalid user ID format", 400, "INVALID_ID");
    }

    if (userIdA === userIdB) {
      throw new AppError("Cannot create a conversation with yourself", 400, "SELF_CONVERSATION");
    }

    const recipient = await User.findById(userIdB);
    if (!recipient) {
      throw new AppError("Recipient user not found", 404, "USER_NOT_FOUND");
    }

    const participantKey = createParticipantKey(userIdA, userIdB);
    let conv = await Conversation.findOne({ participantKey })
      .populate<{ participants: UserDocument[] }>("participants")
      .populate<{ lastMessageId: MessageDocument }>("lastMessageId");

    if (!conv) {
      try {
        const newConv = await Conversation.create({
          participants: [new Types.ObjectId(userIdA), new Types.ObjectId(userIdB)],
          participantKey,
          readCursors: [],
        });

        conv = await Conversation.findById(newConv._id)
          .populate<{ participants: UserDocument[] }>("participants")
          .populate<{ lastMessageId: MessageDocument }>("lastMessageId");
      } catch (err: unknown) {
        // Handle concurrent duplicate key race conditions gracefully
        if (typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 11000) {
          conv = await Conversation.findOne({ participantKey })
            .populate<{ participants: UserDocument[] }>("participants")
            .populate<{ lastMessageId: MessageDocument }>("lastMessageId");
          if (!conv) {
            throw err;
          }
        } else {
          throw err;
        }
      }
    }

    if (!conv) {
      throw new AppError("Failed to initialize conversation", 500, "CONVERSATION_INIT_FAILED");
    }

    return this.mapToDto(conv as unknown as PopulatedConversationDoc, userIdA);
  }

  /**
   * Retrieves all conversations for a user, sorted by last message / update timestamp.
   */
  async getUserConversations(userId: string): Promise<ConversationDto[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new AppError("Invalid user ID format", 400, "INVALID_ID");
    }

    const userObjectId = new Types.ObjectId(userId);

    const conversations = await Conversation.find({ participants: userObjectId })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .populate<{ participants: UserDocument[] }>("participants")
      .populate<{ lastMessageId: MessageDocument }>("lastMessageId");

    const dtos: ConversationDto[] = [];
    for (const conv of conversations) {
      dtos.push(await this.mapToDto(conv as unknown as PopulatedConversationDoc, userId));
    }

    return dtos;
  }

  /**
   * Retrieves a single conversation by ID for an authorized participant.
   */
  async getConversationById(conversationId: string, userId: string): Promise<ConversationDto> {
    const conv = await this.verifyParticipant(conversationId, userId);
    const populated = await Conversation.findById(conv._id)
      .populate<{ participants: UserDocument[] }>("participants")
      .populate<{ lastMessageId: MessageDocument }>("lastMessageId");

    if (!populated) {
      throw new AppError("Conversation not found", 404, "NOT_FOUND");
    }

    return this.mapToDto(populated as unknown as PopulatedConversationDoc, userId);
  }

  /**
   * Validates participant authorization for a conversation.
   */
  async verifyParticipant(
    conversationId: string,
    userId: string
  ): Promise<ConversationDocument> {
    if (!Types.ObjectId.isValid(conversationId)) {
      throw new AppError("Invalid conversation ID format", 400, "INVALID_ID");
    }

    const conv = await Conversation.findById(conversationId);
    if (!conv) {
      throw new AppError("Conversation not found", 404, "NOT_FOUND");
    }

    const isMember = conv.participants.some(
      (p) => p.toString() === userId
    );

    if (!isMember) {
      throw new AppError("You do not have access to this conversation", 403, "FORBIDDEN");
    }

    return conv;
  }

  /**
   * Maps a populated Conversation document to ConversationDto.
   */
  private async mapToDto(
    conv: PopulatedConversationDoc,
    currentUserId: string
  ): Promise<ConversationDto> {
    // Find the other participant in the 1-to-1 conversation
    const other = conv.participants.find(
      (p) => p._id.toString() !== currentUserId
    );

    const participantDto: ConversationParticipantDto = {
      id: other?._id.toString() || "",
      username: other?.username || "unknown",
      displayName: other?.displayName || "Unknown User",
      avatarUrl: other?.avatarUrl,
      bio: other?.bio,
      lastSeenAt: other?.lastSeenAt?.toISOString(),
    };

    let lastMessageDto: LastMessageDto | undefined;
    if (conv.lastMessageId && typeof conv.lastMessageId === "object" && "_id" in conv.lastMessageId) {
      const msg = conv.lastMessageId;
      lastMessageDto = {
        id: msg._id.toString(),
        content: msg.content,
        senderId: msg.senderId.toString(),
        status: msg.status,
        createdAt: msg.createdAt.toISOString(),
      };
    }

    // Calculate unread count using user's read cursor
    const cursor = conv.readCursors.find(
      (c) => c.userId.toString() === currentUserId
    );

    let unreadCount = 0;
    if (other?._id) {
      const unreadQuery: Record<string, unknown> = {
        conversationId: conv._id,
        senderId: other._id,
      };

      if (cursor?.lastReadMessageId) {
        unreadQuery._id = { $gt: cursor.lastReadMessageId };
      }

      unreadCount = await Message.countDocuments(unreadQuery);
    }

    return {
      id: conv._id.toString(),
      participant: participantDto,
      lastMessage: lastMessageDto,
      unreadCount,
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
    };
  }
}

export const conversationService = new ConversationService();
