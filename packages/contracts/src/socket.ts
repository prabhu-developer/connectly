export const SOCKET_EVENTS = {
  // Connection
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  ERROR: "error",

  // Messages
  MESSAGE_SEND: "message:send",
  MESSAGE_ACK: "message:ack",
  MESSAGE_NEW: "message:new",
  MESSAGE_READ: "message:read",
  MESSAGE_STATUS_UPDATE: "message:status_update",

  // Conversations
  CONVERSATION_JOIN: "conversation:join",
  CONVERSATION_LEAVE: "conversation:leave",
  CONVERSATION_READ: "conversation:read",
  CONVERSATION_READ_UPDATE: "conversation:read_update",

  // Presence & Typing
  PRESENCE_CHANGE: "presence:change",
  PRESENCE_SYNC: "presence:sync",
  TYPING_START: "typing:start",
  TYPING_STOP: "typing:stop",
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

export interface PresenceChangePayload {
  userId: string;
  isOnline: boolean;
  lastSeenAt?: string;
}

export interface PresenceSyncPayload {
  onlineUserIds: string[];
}

export interface TypingPayload {
  conversationId: string;
  userId: string;
  username: string;
}

export interface SocketAuthHandshake {
  token: string;
}


