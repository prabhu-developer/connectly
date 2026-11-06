import type { AttachmentDto } from "@repo/contracts/chat";

export type MessageStatus = "sending" | "sent" | "delivered" | "read";

export interface ChatParticipant {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  isOnline: boolean;
  lastSeenAt?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  status: MessageStatus;
  attachment?: AttachmentDto;
  createdAt: string;
  clientTempId?: string;
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface ConversationSummary {
  id: string;
  participant: ChatParticipant;
  lastMessage?: {
    content: string;
    createdAt: string;
    senderId: string;
    status?: MessageStatus;
  };
  unreadCount: number;
  updatedAt: string;
}

