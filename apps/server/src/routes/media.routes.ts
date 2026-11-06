import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.middleware.js";
import { upload } from "../config/multer.config.js";
import { uploadMedia, getMedia } from "../controllers/media.controller.js";
import { AppError } from "../middleware/error.middleware.js";

export const mediaRouter: IRouter = Router();

function handleUploadMiddleware(req: Request, res: Response, next: NextFunction): void {
  upload.single("file")(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return next(new AppError("File size exceeds 10MB limit", 413, "FILE_TOO_LARGE"));
        }
        return next(new AppError(err.message, 400, "UPLOAD_ERROR"));
      }
      return next(err);
    }
    next();
  });
}

// Upload media file (requires authentication)
mediaRouter.post("/upload", requireAuth, handleUploadMiddleware, uploadMedia);

// Retrieve media file (requires authentication to access)
mediaRouter.get("/:filename", requireAuth, getMedia);
