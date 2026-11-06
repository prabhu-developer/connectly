import { createServer } from "node:http";
import { createApp } from "./app.js";
import { createSocketServer } from "./socket/index.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { connectDatabase, disconnectDatabase } from "./db/connection.js";

async function bootstrap(): Promise<void> {
  const app = createApp();
  const httpServer = createServer(app);

  // Initialize Socket.IO real-time engine
  const io = createSocketServer(httpServer);

  // Attempt database connection on startup
  try {
    await connectDatabase();
  } catch {
    logger.warn("⚠️ Initial MongoDB connection failed. Server will continue in degraded mode.");
  }

  httpServer.listen(env.PORT, () => {
    logger.info(`🚀 Connectly server running on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`👉 Health check: http://localhost:${env.PORT}/health`);
    logger.info(`⚡ Socket.IO listening on port ${env.PORT}`);
  });

  // Graceful shutdown handling
  const handleShutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    io.close(() => {
      logger.info("Socket.IO server closed.");
      httpServer.close(async () => {
        logger.info("HTTP server closed.");
        await disconnectDatabase();
        process.exit(0);
      });
    });
  };

  process.on("SIGTERM", () => {
    void handleShutdown("SIGTERM");
  });
  process.on("SIGINT", () => {
    void handleShutdown("SIGINT");
  });
}

bootstrap().catch((err) => {
  logger.error(err, "Fatal error during server bootstrap");
  process.exit(1);
});
