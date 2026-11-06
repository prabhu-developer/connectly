import mongoose from "mongoose";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

export type DatabaseConnectionState = "connected" | "disconnected" | "connecting" | "disconnecting";

export function getDatabaseState(): DatabaseConnectionState {
  switch (mongoose.connection.readyState) {
    case 1:
      return "connected";
    case 2:
      return "connecting";
    case 3:
      return "disconnecting";
    case 0:
    default:
      return "disconnected";
  }
}

let cachedPromise: Promise<typeof mongoose> | null = null;

export async function connectDatabase(uri?: string): Promise<typeof mongoose> {
  const targetUri = uri || env.MONGODB_URI;

  if (mongoose.connection.readyState === 1) {
    logger.debug("Database already connected.");
    return mongoose;
  }

  if (cachedPromise) {
    return cachedPromise;
  }

  // Set up connection event listeners once
  mongoose.connection.removeAllListeners("connected");
  mongoose.connection.removeAllListeners("error");
  mongoose.connection.removeAllListeners("disconnected");

  mongoose.connection.on("connected", () => {
    logger.info(`📦 MongoDB connected successfully [${mongoose.connection.name}]`);
  });

  mongoose.connection.on("error", (err) => {
    logger.error(err, "MongoDB connection error occurred");
    cachedPromise = null;
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected.");
    cachedPromise = null;
  });

  cachedPromise = mongoose.connect(targetUri, {
    autoIndex: env.NODE_ENV !== "production",
    serverSelectionTimeoutMS: 5000,
  }).catch((err) => {
    cachedPromise = null;
    logger.error(err, "Failed to connect to MongoDB");
    throw err;
  });

  return await cachedPromise;
}

export async function disconnectDatabase(): Promise<void> {
  cachedPromise = null;
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info("MongoDB disconnected gracefully.");
  }
}

