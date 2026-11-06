import type { Server as HttpServer } from "node:http";
import { Server as SocketIOServer, type ServerOptions } from "socket.io";
import { env } from "../config/env.js";
import { socketAuthMiddleware } from "./auth.socket.middleware.js";
import { registerSocketHandlers } from "./handlers.js";

let socketServerInstance: SocketIOServer | null = null;

export function getSocketServer(): SocketIOServer | null {
  return socketServerInstance;
}

export function createSocketServer(
  httpServer: HttpServer,
  options?: Partial<ServerOptions>
): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
    pingTimeout: 20000,
    pingInterval: 25000,
    ...options,
  });

  socketServerInstance = io;

  // Attach authentication handshake middleware
  io.use(socketAuthMiddleware);

  // Register real-time event handlers
  registerSocketHandlers(io);

  return io;
}

export type AppSocketServer = SocketIOServer;
