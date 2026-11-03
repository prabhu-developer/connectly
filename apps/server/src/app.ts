import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { requestLogger } from "./middleware/request-logger.middleware.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { apiRouter } from "./routes/index.js";
import { getHealth } from "./controllers/health.controller.js";

export function createApp(): Express {
  const app = express();

  // Security & Ingress Middleware
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );

  // Parsing Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Logging Middleware
  if (env.NODE_ENV !== "test") {
    app.use(requestLogger);
  }

  // Root & Health Checks
  app.get("/health", getHealth);
  app.use("/api", apiRouter);

  // Not Found & Centralized Error Handlers
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

