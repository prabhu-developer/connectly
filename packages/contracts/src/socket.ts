import type { AttachmentDto, MessageDto } from "./chat.js";

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
  MESSAGE_DELETE: "message:delete",

  // Conversations
  CONVERSATION_JOIN: "conversation:join",
  CONVERSATION_LEAVE: "conversation:leave",
  CONVERSATION_READ: "conversation:read",
  CONVERSATION_READ_UPDATE: "conversation:read_update",
  CONVERSATION_DELETE: "conversation:delete",

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

export interface SendMessageSocketPayload {
  conversationId: string;
  content?: string;
  attachment?: AttachmentDto;
  clientTempId?: string;
}

export interface MessageAckPayload {
  success: boolean;
  message?: MessageDto;
  error?: string;
}

export interface MessageNewPayload {
  message: MessageDto;
}

export interface ConversationReadSocketPayload {
  conversationId: string;
  messageId: string;
}

export interface ConversationReadUpdatePayload {
  conversationId: string;
  userId: string;
  messageId: string;
}

export interface MessageStatusUpdatePayload {
  conversationId: string;
  messageId: string;
  status: "delivered" | "read";
}

export interface MessageDeletePayload {
  conversationId: string;
  messageId: string;
}

export interface ConversationDeletePayload {
  conversationId: string;
}



