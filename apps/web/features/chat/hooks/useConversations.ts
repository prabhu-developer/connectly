"use client";

import { useEffect, useState, useCallback, useContext } from "react";
import { chatApi } from "../services/chat.api";
import { SocketContext } from "../context/SocketContext";
import {
  SOCKET_EVENTS,
  type MessageNewPayload,
  type ConversationReadUpdatePayload,
  type MessageStatusUpdatePayload,
} from "@repo/contracts/socket";
import type { ConversationDto } from "@repo/contracts/chat";

export function useConversations(activeConversationId?: string | null) {
  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const socketCtx = useContext(SocketContext);

  const fetchConversations = useCallback(async () => {
    try {
      setError(null);
      const data = await chatApi.getConversations();
      setConversations(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load conversations";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  // Subscribe to real-time socket events for live conversation updates
  useEffect(() => {
    const socket = socketCtx?.socket;
    if (!socket) return;

    function handleMessageNew(payload: MessageNewPayload) {
      if (!payload?.message) return;
      const { message } = payload;

      setConversations((prev) => {
        const existingIdx = prev.findIndex((c) => c.id === message.conversationId);
        if (existingIdx === -1) {
          // If a new conversation was created out of band, trigger full refetch
          void fetchConversations();
          return prev;
        }

        const existing = prev[existingIdx];
        if (!existing) return prev;

        const isViewingActive = activeConversationId === message.conversationId;
        const unreadCount =
          isViewingActive || message.senderId === existing.participant.id
            ? isViewingActive
              ? 0
              : existing.unreadCount + 1
            : existing.unreadCount;

        const updated: ConversationDto = {
          ...existing,
          lastMessage: {
            id: message.id,
            content: message.content,
            senderId: message.senderId,
            status: message.status,
            createdAt: message.createdAt,
          },
          unreadCount,
          updatedAt: message.createdAt,
        };

        // Move active conversation to top of list
        const others = prev.filter((_, idx) => idx !== existingIdx);
        return [updated, ...others];
      });
    }

    function handleReadUpdate(payload: ConversationReadUpdatePayload) {
      if (!payload?.conversationId) return;
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === payload.conversationId) {
            return { ...c, unreadCount: 0 };
          }
          return c;
        })
      );
    }

    function handleStatusUpdate(payload: MessageStatusUpdatePayload) {
      if (!payload?.conversationId || !payload?.messageId) return;
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === payload.conversationId && c.lastMessage?.id === payload.messageId) {
            return {
              ...c,
              lastMessage: {
                ...c.lastMessage,
                status: payload.status,
              },
            };
          }
          return c;
        })
      );
    }

    socket.on(SOCKET_EVENTS.MESSAGE_NEW, handleMessageNew);
    socket.on(SOCKET_EVENTS.CONVERSATION_READ_UPDATE, handleReadUpdate);
    socket.on(SOCKET_EVENTS.MESSAGE_STATUS_UPDATE, handleStatusUpdate);

    return () => {
      socket.off(SOCKET_EVENTS.MESSAGE_NEW, handleMessageNew);
      socket.off(SOCKET_EVENTS.CONVERSATION_READ_UPDATE, handleReadUpdate);
      socket.off(SOCKET_EVENTS.MESSAGE_STATUS_UPDATE, handleStatusUpdate);
    };
  }, [socketCtx?.socket, activeConversationId, fetchConversations]);

  const startConversationWithUser = useCallback(
    async (recipientId: string): Promise<ConversationDto> => {
      const conv = await chatApi.createConversation(recipientId);
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === conv.id);
        if (exists) return prev;
        return [conv, ...prev];
      });
      return conv;
    },
    []
  );

  return {
    conversations,
    isLoading,
    error,
    refetch: fetchConversations,
    startConversationWithUser,
  };
}
