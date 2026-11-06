import { z } from "zod";

export const createConversationSchema = z.object({
  recipientId: z.string({ required_error: "Recipient ID is required" }).trim().min(1),
});
export type CreateConversationInput = z.infer<typeof createConversationSchema>;

export const attachmentSchema = z.object({
  url: z.string().trim().min(1, "Attachment URL is required"),
  type: z.enum(["image", "file"]),
  name: z.string().trim().min(1, "Attachment name is required").max(255),
  size: z.number().int().min(1, "Attachment size must be positive"),
  mimeType: z.string().trim().min(1, "Attachment MIME type is required"),
});
export type AttachmentDto = z.infer<typeof attachmentSchema>;

export const sendMessageSchema = z
  .object({
    content: z
      .string()
      .trim()
      .max(5000, "Message content cannot exceed 5000 characters")
      .default(""),
    attachment: attachmentSchema.optional(),
    clientTempId: z.string().trim().optional(),
  })
  .refine(
    (data) => (data.content && data.content.length > 0) || !!data.attachment,
    {
      message: "Message must contain either text content or an attachment",
      path: ["content"],
    }
  );
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const messageQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});
export type MessageQueryInput = z.infer<typeof messageQuerySchema>;

export const updateReadCursorSchema = z.object({
  messageId: z.string({ required_error: "Message ID is required" }).trim().min(1),
});
export type UpdateReadCursorInput = z.infer<typeof updateReadCursorSchema>;

export const userSearchQuerySchema = z.object({
  q: z.string().trim().min(1, "Search query is required"),
  limit: z.coerce.number().min(1).max(50).default(20),
});
export type UserSearchQueryInput = z.infer<typeof userSearchQuerySchema>;

export interface ConversationParticipantDto {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  lastSeenAt?: string;
}

export interface LastMessageDto {
  id: string;
  content: string;
  senderId: string;
  status: string;
  createdAt: string;
}

export interface ConversationDto {
  id: string;
  participant: ConversationParticipantDto;
  lastMessage?: LastMessageDto;
  unreadCount: number;
  updatedAt: string;
  createdAt: string;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  status: "sent" | "delivered" | "read";
  attachment?: AttachmentDto;
  clientTempId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedMessagesDto {
  messages: MessageDto[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface UserSearchResultDto {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
}
