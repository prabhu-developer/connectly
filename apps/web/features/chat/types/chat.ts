import type { AttachmentDto } from "@repo/contracts/chat";

export type MessageStatus = "sending" | "sent" | "delivered" | "read";

export interface ChatParticipant {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
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

