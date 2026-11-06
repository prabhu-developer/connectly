import type { Request, Response } from "express";
import type { HealthCheckResponse } from "@repo/contracts/health";

export function getHealth(_req: Request, res: Response<HealthCheckResponse>): void {
  res.status(200).json({
    success: true,
    message: "Connectly API is running",
  });
}



