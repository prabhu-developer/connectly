import multer from "multer";
import path from "node:path";
import { AppError } from "../middleware/error.middleware.js";

export const ALLOWED_IMAGE_MIME_TYPES = new Map<string, string[]>([
  ["image/jpeg", [".jpg", ".jpeg"]],
  ["image/png", [".png"]],
  ["image/gif", [".gif"]],
  ["image/webp", [".webp"]],
]);

export const ALLOWED_DOCUMENT_MIME_TYPES = new Map<string, string[]>([
  ["application/pdf", [".pdf"]],
  ["text/plain", [".txt"]],
  ["application/msword", [".doc"]],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", [".docx"]],
]);

export const ALLOWED_MIME_TYPES = new Map<string, string[]>([
  ...ALLOWED_IMAGE_MIME_TYPES,
  ...ALLOWED_DOCUMENT_MIME_TYPES,
]);

// Use memory storage for serverless execution: files are kept in memory buffers (req.file.buffer)
// and streamed directly to Cloudinary without writing to the read-only /var/task filesystem.
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB overall ceiling for Multer
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowedExts = ALLOWED_MIME_TYPES.get(file.mimetype);
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedExts || !allowedExts.includes(ext)) {
      return cb(
        new AppError(
          `Unsupported file type: ${file.mimetype} (${ext}). Allowed formats: JPEG, JPG, PNG, WebP, GIF, PDF, DOC, DOCX, TXT`,
          400,
          "INVALID_FILE_TYPE"
        )
      );
    }

    cb(null, true);
  },
});
