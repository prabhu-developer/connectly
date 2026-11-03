import mongoose, { Schema, type Document, type Model, Types } from "mongoose";

export interface IRefreshSession {
  userId: Types.ObjectId;
  tokenHash: string;
  isRevoked: boolean;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefreshSessionDocument extends IRefreshSession, Document {}

const refreshSessionSchema = new Schema<RefreshSessionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    tokenHash: {
      type: String,
      required: [true, "Token hash is required"],
      unique: true,
    },
    isRevoked: {
      type: Boolean,
      default: false,
    },
    userAgent: {
      type: String,
      trim: true,
      default: undefined,
    },
    ipAddress: {
      type: String,
      trim: true,
      default: undefined,
    },
    expiresAt: {
      type: Date,
      required: [true, "Expiration date is required"],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
refreshSessionSchema.index({ userId: 1, isRevoked: 1 });

/**
 * MongoDB TTL index for automated background cleanup.
 * NOTE: As per system architecture rules, this TTL cleanup is an asynchronous background task.
 * Every session authentication check MUST explicitly verify `expiresAt > new Date()` and
 * `isRevoked === false` in application code rather than relying on TTL index deletion.
 */
refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshSession: Model<RefreshSessionDocument> =
  mongoose.models.RefreshSession ||
  mongoose.model<RefreshSessionDocument>("RefreshSession", refreshSessionSchema);
