import mongoose, { Schema, type Document, type Model, Types } from "mongoose";

export interface IAttachment {
  url: string;
  type: "image" | "file";
  name: string;
  size: number;
  mimeType: string;
}

export type MessageStatus = "sent" | "delivered" | "read";

export interface IMessage {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  clientTempId?: string;
  content: string;
  status: MessageStatus;
  attachment?: IAttachment;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageDocument extends IMessage, Document {}

const attachmentSchema = new Schema<IAttachment>(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["image", "file"],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    size: {
      type: Number,
      required: true,
      min: 1,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const messageSchema = new Schema<MessageDocument>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: [true, "Conversation ID is required"],
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender ID is required"],
      index: true,
    },
    clientTempId: {
      type: String,
      trim: true,
      default: undefined,
    },
    content: {
      type: String,
      required: function (this: MessageDocument) {
        // Content is required unless there's an attachment
        return !this.attachment;
      },
      trim: true,
      maxlength: [5000, "Message content cannot exceed 5000 characters"],
      default: "",
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },
    attachment: {
      type: attachmentSchema,
      default: undefined,
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

// Idempotency constraint: identical clientTempId from same sender in same conversation is rejected.
// Uses partialFilterExpression to only enforce uniqueness when clientTempId is a non-null string.
messageSchema.index(
  { conversationId: 1, senderId: 1, clientTempId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      clientTempId: { $type: "string" },
    },
  }
);

// Cursor pagination index
messageSchema.index({ conversationId: 1, createdAt: -1 });

export const Message: Model<MessageDocument> =
  mongoose.models.Message || mongoose.model<MessageDocument>("Message", messageSchema);
