"use client";

import { useEffect, useState, useCallback, useContext, useRef } from "react";
import { chatApi } from "../services/chat.api";
import { SocketContext } from "../context/SocketContext";
import {
  SOCKET_EVENTS,
  type MessageNewPayload,
  type ConversationReadUpdatePayload,
  type MessageStatusUpdatePayload,
  type MessageAckPayload,
} from "@repo/contracts/socket";
import type { MessageDto } from "@repo/contracts/chat";

export function useChatMessages(conversationId: string | null, currentUserId: string) {
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const socketCtx = useContext(SocketContext);
  const convIdRef = useRef(conversationId);
  convIdRef.current = conversationId;

  // Initial load when conversationId changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setHasMore(false);
      setNextCursor(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    async function loadInitial() {
      try {
        const data = await chatApi.getMessages(conversationId!);
        if (isMounted) {
          setMessages(data.messages);
          setHasMore(data.hasMore);
          setNextCursor(data.nextCursor);

          // Mark latest incoming message as read if there are unread messages
          const latest = data.messages[data.messages.length - 1];
          if (latest && latest.senderId !== currentUserId) {
            void chatApi.markConversationRead(conversationId!, latest.id);
            if (socketCtx?.socket?.connected) {
              socketCtx.socket.emit(SOCKET_EVENTS.CONVERSATION_READ, {
                conversationId: conversationId!,
                messageId: latest.id,
              });
            }
          }
        }
      } catch {
        if (isMounted) {
          setMessages([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitial();

    return () => {
      isMounted = false;
    };
  }, [conversationId, currentUserId, socketCtx?.socket]);

  // Real-time socket subscriptions for this conversation
  useEffect(() => {
    const socket = socketCtx?.socket;
    if (!socket || !conversationId) return;

    function handleNewMessage(payload: MessageNewPayload) {
      if (!payload?.message || payload.message.conversationId !== convIdRef.current) return;
      const { message } = payload;

      setMessages((prev) => {
        // If message was sent optimistically by this client, replace it
        if (message.clientTempId) {
          const optIdx = prev.findIndex((m) => m.clientTempId === message.clientTempId);
          if (optIdx !== -1) {
            const next = [...prev];
            next[optIdx] = message;
            return next;
          }
        }

        // Avoid duplicate ID appends
        if (prev.some((m) => m.id === message.id)) {
          return prev;
        }

        return [...prev, message];
      });

      // If message is from other user, automatically mark as read
      if (message.senderId !== currentUserId) {
        socket?.emit(SOCKET_EVENTS.CONVERSATION_READ, {
          conversationId: convIdRef.current,
          messageId: message.id,
        });
      }
    }

    function handleStatusUpdate(payload: MessageStatusUpdatePayload) {
      if (payload.conversationId !== convIdRef.current) return;
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === payload.messageId) {
            return { ...m, status: payload.status };
          }
          return m;
        })
      );
    }

    function handleReadUpdate(payload: ConversationReadUpdatePayload) {
      if (payload.conversationId !== convIdRef.current) return;
      // If the other participant read up to payload.messageId, update our sent messages to "read"
      if (payload.userId !== currentUserId) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.senderId === currentUserId && m.status !== "read") {
              return { ...m, status: "read" };
            }
            return m;
          })
        );
      }
    }

    socket.on(SOCKET_EVENTS.MESSAGE_NEW, handleNewMessage);
    socket.on(SOCKET_EVENTS.MESSAGE_STATUS_UPDATE, handleStatusUpdate);
    socket.on(SOCKET_EVENTS.CONVERSATION_READ_UPDATE, handleReadUpdate);

    return () => {
      socket.off(SOCKET_EVENTS.MESSAGE_NEW, handleNewMessage);
      socket.off(SOCKET_EVENTS.MESSAGE_STATUS_UPDATE, handleStatusUpdate);
      socket.off(SOCKET_EVENTS.CONVERSATION_READ_UPDATE, handleReadUpdate);
    };
  }, [socketCtx?.socket, conversationId, currentUserId]);

  const loadMore = useCallback(async () => {
    if (!conversationId || !nextCursor || isLoading) return;

    try {
      const data = await chatApi.getMessages(conversationId, nextCursor);
      setMessages((prev) => [...data.messages, ...prev]);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch {
      // Continue gracefully on pagination error
    }
  }, [conversationId, nextCursor, isLoading]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId || !content.trim()) return;

      const clientTempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const optimisticMessage: MessageDto = {
        id: clientTempId,
        conversationId,
        senderId: currentUserId,
        content: content.trim(),
        status: "sent",
        clientTempId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Optimistically append message immediately
      setMessages((prev) => [...prev, optimisticMessage]);

      const socket = socketCtx?.socket;

      // Try sending via Socket.IO if connected
      if (socket?.connected) {
        socket.emit(
          SOCKET_EVENTS.MESSAGE_SEND,
          {
            conversationId,
            content: content.trim(),
            clientTempId,
          },
          (ack: MessageAckPayload) => {
            if (ack?.success && ack.message) {
              setMessages((prev) =>
                prev.map((m) => (m.clientTempId === clientTempId ? ack.message! : m))
              );
            }
          }
        );
      } else {
        // Fallback to REST API
        try {
          const confirmed = await chatApi.sendMessage(conversationId, content.trim(), clientTempId);
          setMessages((prev) =>
            prev.map((m) => (m.clientTempId === clientTempId ? confirmed : m))
          );
        } catch {
          // Keep message in list but mark as error/failed if needed
        }
      }
    },
    [conversationId, currentUserId, socketCtx?.socket]
  );

  return {
    messages,
    isLoading,
    hasMore,
    loadMore,
    sendMessage,
  };
}
