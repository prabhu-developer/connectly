import mongoose, { Schema, type Document, type Model, Types } from "mongoose";

export interface IMedia {
  filename: string;
  originalName: string;
  storageKey: string;
  url: string;
  resourceType: "image" | "raw" | "auto";
  mimeType: string;
  size: number;
  uploaderId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaDocument extends IMedia, Document {}

const mediaSchema = new Schema<MediaDocument>(
  {
    filename: {
      type: String,
      required: [true, "Filename is required"],
      unique: true,
      trim: true,
      index: true,
    },
    originalName: {
      type: String,
      required: [true, "Original name is required"],
      trim: true,
    },
    storageKey: {
      type: String,
      required: [true, "Storage key is required"],
      trim: true,
    },
    url: {
      type: String,
      required: [true, "URL is required"],
      trim: true,
    },
    resourceType: {
      type: String,
      enum: ["image", "raw", "auto"],
      required: true,
      default: "auto",
    },
    mimeType: {
      type: String,
      required: [true, "MIME type is required"],
      trim: true,
    },
    size: {
      type: Number,
      required: [true, "File size is required"],
      min: 1,
    },
    uploaderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Uploader ID is required"],
      index: true,
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

export const Media: Model<MediaDocument> =
  mongoose.models.Media || mongoose.model<MediaDocument>("Media", mediaSchema);
