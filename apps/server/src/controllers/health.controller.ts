import type { Request, Response } from "express";
import type { HealthCheckResponse } from "@repo/contracts/health";
import { env } from "../config/env.js";
import { getDatabaseState } from "../db/connection.js";

const startTime = Date.now();

export function getHealth(_req: Request, res: Response<HealthCheckResponse>): void {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const dbState = getDatabaseState();

  const serviceStatus = dbState === "connected" ? "ok" : "degraded";

  res.status(200).json({
    status: serviceStatus,
    timestamp: new Date().toISOString(),
    uptime: uptimeSeconds,
    version: "0.1.0",
    environment: env.NODE_ENV,
    services: {
      database: dbState === "disconnecting" ? "disconnected" : dbState,
      socket: "stopped", // Updated in Phase 07
    },
  });
}


