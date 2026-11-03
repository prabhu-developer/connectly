import type { Request, Response } from "express";
import type { HealthCheckResponse } from "@repo/contracts/health";
import { env } from "../config/env.js";

const startTime = Date.now();

export function getHealth(_req: Request, res: Response<HealthCheckResponse>): void {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: uptimeSeconds,
    version: "0.1.0",
    environment: env.NODE_ENV,
    services: {
      database: "disconnected", // Updated in Phase 02 when MongoDB is configured
      socket: "stopped",        // Updated in Phase 07 when Socket.IO is configured
    },
  });
}

