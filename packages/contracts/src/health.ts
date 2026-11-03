export interface HealthCheckResponse {
  status: "ok" | "degraded" | "error";
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services?: {
    database?: "connected" | "disconnected" | "connecting";
    socket?: "running" | "stopped";
  };
}

