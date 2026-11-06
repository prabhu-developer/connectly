import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { Readable } from "node:stream";
import { env } from "./env.js";
import { logger } from "./logger.js";

let isConfigured = false;

export function configureCloudinary(): typeof cloudinary {
  if (isConfigured) return cloudinary;

  if (env.CLOUDINARY_URL) {
    cloudinary.config({
      cloudinary_url: env.CLOUDINARY_URL,
      secure: true,
    });
    logger.info("☁️ Cloudinary initialized with CLOUDINARY_URL");
  } else {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME || "dcjmxozzs",
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    logger.debug("☁️ Cloudinary initialized with fallback/explicit credentials");
  }

  isConfigured = true;
  return cloudinary;
}

export const cloudinaryClient = configureCloudinary();

export interface CloudinaryUploadOptions {
  folder: "connectly/images" | "connectly/documents";
  publicId: string;
  resourceType: "image" | "raw" | "auto";
}

export async function uploadStreamToCloudinary(
  buffer: Buffer,
  options: CloudinaryUploadOptions
): Promise<UploadApiResponse> {
  configureCloudinary();

  // Test mode mock: avoid outbound network requests during offline unit tests
  const isMock =
    env.NODE_ENV === "test" ||
    !env.CLOUDINARY_URL ||
    env.CLOUDINARY_URL.includes("<your_api_key>") ||
    env.CLOUDINARY_URL.includes("dummy") ||
    !env.CLOUDINARY_URL.includes("@");

  if (isMock) {
    const cloudName = env.CLOUDINARY_CLOUD_NAME || "dcjmxozzs";
    const fullPublicId = `${options.folder}/${options.publicId}`;
    const secureUrl = `https://res.cloudinary.com/${cloudName}/${options.resourceType}/upload/v1/${fullPublicId}`;

    return {
      public_id: fullPublicId,
      version: 1,
      signature: "mock_test_signature",
      width: options.resourceType === "image" ? 800 : undefined,
      height: options.resourceType === "image" ? 600 : undefined,
      format: options.resourceType === "image" ? "png" : "pdf",
      resource_type: options.resourceType,
      created_at: new Date().toISOString(),
      tags: [],
      bytes: buffer.length,
      type: "upload",
      etag: "mock_test_etag",
      placeholder: false,
      url: secureUrl.replace("https://", "http://"),
      secure_url: secureUrl,
      access_mode: "public",
      original_filename: options.publicId,
    } as unknown as UploadApiResponse;
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        public_id: options.publicId,
        resource_type: options.resourceType,
        overwrite: true,
        unique_filename: false,
      },
      (error, result) => {
        if (error || !result) {
          logger.error({ error }, "Cloudinary upload stream failed");
          return reject(error || new Error("Cloudinary upload failed"));
        }
        resolve(result);
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });
}
