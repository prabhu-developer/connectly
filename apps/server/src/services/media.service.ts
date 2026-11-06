import path from "node:path";
import crypto from "node:crypto";
import { Types } from "mongoose";
import type { AttachmentDto } from "@repo/contracts/chat";
import { AppError } from "../middleware/error.middleware.js";
import { ALLOWED_MIME_TYPES } from "../config/multer.config.js";
import { validateFileContent } from "../utils/file-validator.utils.js";
import { uploadStreamToCloudinary } from "../config/cloudinary.config.js";
import { Media, type MediaDocument } from "../models/media.model.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

// In-memory buffer cache to support fast, deterministic, offline retrieval during tests
const testBufferCache = new Map<string, { buffer: Buffer; mimeType: string }>();

export class MediaService {
  async processAndUpload(
    file: Express.Multer.File,
    uploaderId: Types.ObjectId | string
  ): Promise<{ media: MediaDocument; attachment: AttachmentDto & { secureUrl: string } }> {
    if (!file || !file.buffer) {
      throw new AppError("No file uploaded", 400, "FILE_REQUIRED");
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const isImage =
      file.mimetype.startsWith("image/") ||
      [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext);

    // 1. Enforce category-specific size restrictions:
    // Images: 5 MB limit
    if (isImage && file.size > 5 * 1024 * 1024) {
      throw new AppError("Image file size exceeds 5MB limit", 413, "FILE_TOO_LARGE");
    }
    // Documents: 10 MB limit
    if (!isImage && file.size > 10 * 1024 * 1024) {
      throw new AppError("Document file size exceeds 10MB limit", 413, "FILE_TOO_LARGE");
    }

    // 2. Validate MIME type & extension matching
    const allowedExts = ALLOWED_MIME_TYPES.get(file.mimetype);
    if (!allowedExts || !allowedExts.includes(ext)) {
      throw new AppError(
        `Unsupported file type: ${file.mimetype} (${ext}). Allowed formats: JPEG, JPG, PNG, WebP, GIF, PDF, DOC, DOCX, TXT`,
        400,
        "INVALID_FILE_TYPE"
      );
    }

    // 3. Validate content inspection (magic bytes)
    const isContentValid = validateFileContent(file.buffer, file.mimetype, ext);
    if (!isContentValid) {
      throw new AppError(
        "File content does not match its claimed MIME type or format",
        400,
        "INVALID_FILE_CONTENT"
      );
    }

    // 4. Generate unique identifiers and sanitize filename
    const safeBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 50);
    const uniqueSuffix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const filename = `${uniqueSuffix}-${safeBase}${ext}`;
    const publicId = `${uniqueSuffix}-${safeBase}`;
    const folder = isImage ? "connectly/images" : "connectly/documents";
    const resourceType: "image" | "raw" = isImage ? "image" : "raw";

    // 5. Upload to Cloudinary via stream (or mock in test mode)
    const uploadResult = await uploadStreamToCloudinary(file.buffer, {
      folder,
      publicId,
      resourceType,
    });

    // 6. Cache buffer in test mode for instant local retrieval
    if (env.NODE_ENV === "test") {
      testBufferCache.set(filename, { buffer: file.buffer, mimeType: file.mimetype });
    }

    // 7. Store attachment metadata in MongoDB
    const media = await Media.create({
      filename,
      originalName: file.originalname,
      storageKey: uploadResult.public_id,
      url: uploadResult.secure_url,
      resourceType,
      mimeType: file.mimetype,
      size: file.size,
      uploaderId: new Types.ObjectId(uploaderId),
    });

    logger.info(
      `📦 Media metadata stored in MongoDB: ${media.filename} -> ${media.storageKey} (${media.size} bytes)`
    );

    const attachment: AttachmentDto & { secureUrl: string } = {
      url: `/api/media/${encodeURIComponent(filename)}`,
      secureUrl: media.url,
      type: isImage ? "image" : "file",
      name: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };

    return { media, attachment };
  }

  async getMediaByFilename(filename: string): Promise<MediaDocument | null> {
    const safeFilename = path.basename(filename);
    return await Media.findOne({ filename: safeFilename });
  }

  getTestCachedBuffer(filename: string): { buffer: Buffer; mimeType: string } | undefined {
    return testBufferCache.get(path.basename(filename));
  }

  registerTestBuffer(filename: string, buffer: Buffer, mimeType: string): void {
    testBufferCache.set(path.basename(filename), { buffer, mimeType });
  }
}

export const mediaService = new MediaService();
