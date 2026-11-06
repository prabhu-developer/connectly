import type { Request, Response, NextFunction } from "express";
import path from "node:path";
import { Readable } from "node:stream";
import { AppError } from "../middleware/error.middleware.js";
import { mediaService } from "../services/media.service.js";

export async function uploadMedia(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      throw new AppError("No file uploaded", 400, "FILE_REQUIRED");
    }

    const userId = (req as unknown as { user?: { id?: string; _id?: string } }).user?.id ||
      (req as unknown as { user?: { id?: string; _id?: string } }).user?._id;

    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { attachment } = await mediaService.processAndUpload(req.file, userId);

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

    const safeFilename = path.basename(rawFilename);
    const media = await mediaService.getMediaByFilename(safeFilename);

    if (!media) {
      throw new AppError("File not found", 404, "FILE_NOT_FOUND");
    }

    const isDownload = req.query.download === "1" || req.query.download === "true";
    const disposition = isDownload ? "attachment" : "inline";

    res.setHeader(
      "Content-Disposition",
      `${disposition}; filename="${encodeURIComponent(media.originalName)}"`
    );
    res.setHeader("Content-Type", media.mimeType);

    // 1. If buffer is cached in memory (e.g. during test executions)
    const cached = mediaService.getTestCachedBuffer(safeFilename);
    if (cached) {
      res.status(200).send(cached.buffer);
      return;
    }

    // 2. Stream directly from Cloudinary
    try {
      const response = await fetch(media.url);
      if (response.ok && response.body) {
        res.status(200);
        const stream = Readable.fromWeb(response.body as any);
        stream.pipe(res);
        return;
      }
    } catch {
      // If direct streaming fails, redirect to Cloudinary CDN
      res.redirect(302, media.url);
      return;
    }

    // 3. Fallback: redirect to Cloudinary secure URL
    res.redirect(302, media.url);
  } catch (err) {
    next(err);
  }
}
