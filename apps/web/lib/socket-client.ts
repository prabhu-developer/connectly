import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "./api-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  (process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, "")
    : "http://localhost:5000");

let socketInstance: Socket | null = null;

export function getSocket(token?: string): Socket {
  const authToken = token || getAccessToken();

  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      autoConnect: false,
      withCredentials: true,
      transports: ["websocket", "polling"],
      auth: {
        token: authToken,
      },
    });
  } else if (authToken) {
    // Update auth token if it changed
    socketInstance.auth = { token: authToken };
  }

  return socketInstance;
}

export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
