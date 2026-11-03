import mongoose, { Schema, type Document, type Model, Types } from "mongoose";

export interface IReadCursor {
  userId: Types.ObjectId;
  lastReadMessageId: Types.ObjectId;
  readAt: Date;
}

export interface IConversation {
  participants: Types.ObjectId[];
  participantKey: string;
  lastMessageId?: Types.ObjectId;
  lastMessageAt?: Date;
  readCursors: IReadCursor[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationDocument extends IConversation, Document {}

/**
 * Creates a deterministic, sorted participant key for 1-to-1 conversations.
 * e.g., createParticipantKey("65ab...", "65aa...") => "65aa...:65ab..."
 */
export function createParticipantKey(
  userA: string | Types.ObjectId,
  userB: string | Types.ObjectId
): string {
  const strA = userA.toString();
  const strB = userB.toString();
  return strA < strB ? `${strA}:${strB}` : `${strB}:${strA}`;
}

const readCursorSchema = new Schema<IReadCursor>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastReadMessageId: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      required: true,
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const conversationSchema = new Schema<ConversationDocument>(
  {
    participants: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
      ],
      validate: [
        {
          validator(val: Types.ObjectId[]) {
            return Array.isArray(val) && val.length === 2;
          },
          message: "1-to-1 conversations must have exactly 2 participants",
        },
        {
          validator(val: Types.ObjectId[]) {
            return val[0]?.toString() !== val[1]?.toString();
          },
          message: "A user cannot create a conversation with themselves",
        },
      ],
      required: true,
    },
    participantKey: {
      type: String,
      required: true,
      unique: true,
    },
    lastMessageId: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      default: undefined,
    },
    lastMessageAt: {
      type: Date,
      default: undefined,
    },
    readCursors: {
      type: [readCursorSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });

export const Conversation: Model<ConversationDocument> =
  mongoose.models.Conversation ||
  mongoose.model<ConversationDocument>("Conversation", conversationSchema);
