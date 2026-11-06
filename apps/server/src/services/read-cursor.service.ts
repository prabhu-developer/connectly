import { Types } from "mongoose";
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import { conversationService } from "./conversation.service.js";
import { AppError } from "../middleware/error.middleware.js";

export class ReadCursorService {
  /**
   * Advances a user's read cursor in a conversation and marks messages as read.
   */
  async updateReadCursor(
    conversationId: string,
    userId: string,
    messageId: string
  ): Promise<{ success: boolean; readMessageId: string }> {
    if (!Types.ObjectId.isValid(messageId)) {
      throw new AppError("Invalid message ID format", 400, "INVALID_ID");
    }

    // Verify user is a member of this conversation
    const conv = await conversationService.verifyParticipant(conversationId, userId);

    const message = await Message.findOne({
      _id: new Types.ObjectId(messageId),
      conversationId: new Types.ObjectId(conversationId),
    });

    if (!message) {
      throw new AppError("Target message not found in this conversation", 404, "MESSAGE_NOT_FOUND");
    }

    const readAt = new Date();
    const userObjectId = new Types.ObjectId(userId);
    const messageObjectId = new Types.ObjectId(messageId);

    // 1. Update or append user's read cursor on the conversation
    const cursorIndex = conv.readCursors.findIndex(
      (c) => c.userId.toString() === userId
    );

    if (cursorIndex >= 0) {
      await Conversation.updateOne(
        { _id: conv._id, "readCursors.userId": userObjectId },
        {
          $set: {
            "readCursors.$.lastReadMessageId": messageObjectId,
            "readCursors.$.readAt": readAt,
          },
        }
      );
    } else {
      await Conversation.updateOne(
        { _id: conv._id },
        {
          $push: {
            readCursors: {
              userId: userObjectId,
              lastReadMessageId: messageObjectId,
              readAt,
            },
          },
        }
      );
    }

    // 2. Mark incoming messages up to this message as "read"
    await Message.updateMany(
      {
        conversationId: conv._id,
        senderId: { $ne: userObjectId },
        createdAt: { $lte: message.createdAt },
        status: { $ne: "read" },
      },
      {
        $set: { status: "read" },
      }
    );

    return {
      success: true,
      readMessageId: messageId,
    };
  }
}

export const readCursorService = new ReadCursorService();
