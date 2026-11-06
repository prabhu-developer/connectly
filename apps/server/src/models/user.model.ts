import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IUserSettings {
  soundEnabled: boolean;
  enterToSend: boolean;
  desktopNotifications: boolean;
  theme: "light" | "dark" | "system";
}

export interface IUser {
  email: string;
  username: string;
  passwordHash: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  settings?: IUserSettings;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDocument extends IUser, Document {}

const userSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [255, "Email cannot exceed 255 characters"],
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      match: [/^[a-z0-9_]+$/, "Username can only contain alphanumeric characters and underscores"],
    },
    passwordHash: {
      type: String,
      required: [true, "Password hash is required"],
      select: false, // Protected: never returned by default in queries
    },
    displayName: {
      type: String,
      required: [true, "Display name is required"],
      trim: true,
      minlength: [1, "Display name must be at least 1 character"],
      maxlength: [50, "Display name cannot exceed 50 characters"],
    },
    avatarUrl: {
      type: String,
      trim: true,
      default: undefined,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [160, "Bio cannot exceed 160 characters"],
      default: "",
    },
    settings: {
      soundEnabled: { type: Boolean, default: true },
      enterToSend: { type: Boolean, default: true },
      desktopNotifications: { type: Boolean, default: false },
      theme: { type: String, enum: ["light", "dark", "system"], default: "system" },
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Text index for user discovery
userSchema.index({ username: "text", displayName: "text" });

export const User: Model<UserDocument> =
  mongoose.models.User || mongoose.model<UserDocument>("User", userSchema);
