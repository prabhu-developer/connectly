import { apiClient } from "../../../lib/api-client";
import type { ApiResponse } from "@repo/contracts/api";
import type {
  AttachmentDto,
  ConversationDto,
  MessageDto,
  MessageSearchResultDto,
  PaginatedMessagesDto,
  UserSearchResultDto,
} from "@repo/contracts/chat";

export const chatApi = {
  async getConversations(): Promise<ConversationDto[]> {
    const res = await apiClient.get<ApiResponse<ConversationDto[]>>("/conversations");
    if (!res.data.success) {
      throw new Error(res.data.error.message);
    }
    return res.data.data;
  },

  async createConversation(recipientId: string): Promise<ConversationDto> {
    const res = await apiClient.post<ApiResponse<ConversationDto>>("/conversations", {
      recipientId,
    });
    if (!res.data.success) {
      throw new Error(res.data.error.message);
    }
    return res.data.data;
  },

  async getMessages(
    conversationId: string,
    cursor?: string,
    limit = 50
  ): Promise<PaginatedMessagesDto> {
    const res = await apiClient.get<ApiResponse<PaginatedMessagesDto>>(
      `/conversations/${conversationId}/messages`,
      { params: { cursor, limit } }
    );
    if (!res.data.success) {
      throw new Error(res.data.error.message);
    }
    return res.data.data;
  },

  async sendMessage(
    conversationId: string,
    content?: string,
    attachment?: AttachmentDto,
    clientTempId?: string
  ): Promise<MessageDto> {
    const res = await apiClient.post<ApiResponse<MessageDto>>(
      `/conversations/${conversationId}/messages`,
      { content, attachment, clientTempId }
    );
    if (!res.data.success) {
      throw new Error(res.data.error.message);
    }
    return res.data.data;
  },

  async uploadMedia(file: File): Promise<AttachmentDto> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await apiClient.post<ApiResponse<AttachmentDto>>("/media/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    if (!res.data.success) {
      throw new Error(res.data.error.message);
    }
    return res.data.data;
  },

  async markConversationRead(conversationId: string, messageId: string): Promise<void> {
    const res = await apiClient.post<ApiResponse<{ success: boolean }>>(
      `/conversations/${conversationId}/read`,
      { messageId }
    );
    if (!res.data.success) {
      throw new Error(res.data.error.message);
    }
  },

  async searchUsers(query: string): Promise<UserSearchResultDto[]> {
    const res = await apiClient.get<ApiResponse<UserSearchResultDto[]>>("/users/search", {
      params: { q: query },
    });
    if (!res.data.success) {
      throw new Error(res.data.error.message);
    }
    return res.data.data;
  },

  async searchMessages(
    conversationId: string,
    query: string,
    limit = 20
  ): Promise<MessageSearchResultDto[]> {
    const res = await apiClient.get<ApiResponse<MessageSearchResultDto[]>>(
      `/conversations/${conversationId}/messages/search`,
      { params: { q: query, limit } }
    );
    if (!res.data.success) {
      throw new Error(res.data.error.message);
    }
    return res.data.data;
  },

  async deleteConversation(conversationId: string): Promise<void> {
    const res = await apiClient.delete<ApiResponse<{ message: string }>>(
      `/conversations/${conversationId}`
    );
    if (!res.data.success) {
      throw new Error(res.data.error.message);
    }
  },

  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    const res = await apiClient.delete<ApiResponse<{ message: string }>>(
      `/conversations/${conversationId}/messages/${messageId}`
    );
    if (!res.data.success) {
      throw new Error(res.data.error.message);
    }
  },
};
