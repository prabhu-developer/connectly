import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Connectly server running on port ${env.PORT} [${env.NODE_ENV}]`);
  logger.info(`👉 Health check: http://localhost:${env.PORT}/health`);
});

// Graceful shutdown handling
function handleShutdown(signal: string): void {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    logger.info("HTTP server closed.");
    process.exit(0);
  });
}

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));

