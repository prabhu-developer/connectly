import type { Request, Response, NextFunction } from "express";
import path from "node:path";
import fs from "node:fs";
import { AppError } from "../middleware/error.middleware.js";
import { UPLOAD_DIR } from "../config/multer.config.js";
import type { AttachmentDto } from "@repo/contracts/chat";

export async function uploadMedia(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      throw new AppError("No file uploaded", 400, "FILE_REQUIRED");
    }

    const isImage = req.file.mimetype.startsWith("image/");
    const attachment: AttachmentDto = {
      url: `/api/media/${encodeURIComponent(req.file.filename)}`,
      type: isImage ? "image" : "file",
      name: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    };

    res.status(201).json({
      success: true,
      data: attachment,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMedia(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawParam = req.params.filename;
    const rawFilename = Array.isArray(rawParam) ? rawParam[0] : rawParam;
    if (!rawFilename) {
      throw new AppError("Filename is required", 400, "INVALID_FILENAME");
    }

    // Guard against path traversal
    const safeFilename = path.basename(rawFilename);
    const resolvedPath = path.resolve(UPLOAD_DIR, safeFilename);

    // Verify resolved path stays strictly within UPLOAD_DIR
    if (!resolvedPath.startsWith(path.resolve(UPLOAD_DIR))) {
      throw new AppError("Invalid file path", 400, "INVALID_PATH");
    }

    if (!fs.existsSync(resolvedPath)) {
      throw new AppError("File not found", 404, "FILE_NOT_FOUND");
    }

    const isDownload = req.query.download === "1" || req.query.download === "true";
    if (isDownload) {
      res.download(resolvedPath, safeFilename);
    } else {
      res.sendFile(resolvedPath);
    }
  } catch (err) {
    next(err);
  }
}
