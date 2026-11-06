"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import type { Socket } from "socket.io-client";
import {
  SOCKET_EVENTS,
  type PresenceChangePayload,
  type PresenceSyncPayload,
  type TypingPayload,
} from "@repo/contracts/socket";
import { getSocket, disconnectSocket } from "../../../lib/socket-client";
import { getAccessToken } from "../../../lib/api-client";
import { useAuthSession } from "../../auth/hooks/useAuthSession";

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  onlineUserIds: Set<string>;
  typingUsers: Record<string, string[]>;
  isUserOnline: (userId: string) => boolean;
  sendTypingStart: (conversationId: string) => void;
  sendTypingStop: (conversationId: string) => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
}

export const SocketContext = createContext<SocketContextValue | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthSession();
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        disconnectSocket();
        socketRef.current = null;
        setIsConnected(false);
        setOnlineUserIds(new Set());
        setTypingUsers({});
      }
      return;
    }

    const token = getAccessToken();
    const socket = getSocket(token || undefined);
    socketRef.current = socket;

    function handleConnect() {
      setIsConnected(true);
    }

    function handleDisconnect() {
      setIsConnected(false);
    }

    function handlePresenceSync(payload: PresenceSyncPayload) {
      if (payload?.onlineUserIds) {
        setOnlineUserIds(new Set(payload.onlineUserIds));
      }
    }

    function handlePresenceChange(payload: PresenceChangePayload) {
      if (!payload?.userId) return;
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (payload.isOnline) {
          next.add(payload.userId);
        } else {
          next.delete(payload.userId);
        }
        return next;
      });
    }

    function handleTypingStart(payload: TypingPayload) {
      if (!payload?.conversationId || !payload?.username) return;
      setTypingUsers((prev) => {
        const currentList = prev[payload.conversationId] || [];
        if (!currentList.includes(payload.username)) {
          return {
            ...prev,
            [payload.conversationId]: [...currentList, payload.username],
          };
        }
        return prev;
      });
    }

    function handleTypingStop(payload: TypingPayload) {
      if (!payload?.conversationId || !payload?.username) return;
      setTypingUsers((prev) => {
        const currentList = prev[payload.conversationId] || [];
        return {
          ...prev,
          [payload.conversationId]: currentList.filter((u) => u !== payload.username),
        };
      });
    }

    socket.on(SOCKET_EVENTS.CONNECT, handleConnect);
    socket.on(SOCKET_EVENTS.DISCONNECT, handleDisconnect);
    socket.on(SOCKET_EVENTS.PRESENCE_SYNC, handlePresenceSync);
    socket.on(SOCKET_EVENTS.PRESENCE_CHANGE, handlePresenceChange);
    socket.on(SOCKET_EVENTS.TYPING_START, handleTypingStart);
    socket.on(SOCKET_EVENTS.TYPING_STOP, handleTypingStop);

    if (!socket.connected) {
      socket.connect();
    } else {
      setIsConnected(true);
    }

    return () => {
      socket.off(SOCKET_EVENTS.CONNECT, handleConnect);
      socket.off(SOCKET_EVENTS.DISCONNECT, handleDisconnect);
      socket.off(SOCKET_EVENTS.PRESENCE_SYNC, handlePresenceSync);
      socket.off(SOCKET_EVENTS.PRESENCE_CHANGE, handlePresenceChange);
      socket.off(SOCKET_EVENTS.TYPING_START, handleTypingStart);
      socket.off(SOCKET_EVENTS.TYPING_STOP, handleTypingStop);
    };
  }, [isAuthenticated, user]);

  const isUserOnline = useCallback(
    (userId: string): boolean => {
      return onlineUserIds.has(userId);
    },
    [onlineUserIds]
  );

  const sendTypingStart = useCallback((conversationId: string) => {
    if (socketRef.current?.connected && conversationId) {
      socketRef.current.emit(SOCKET_EVENTS.TYPING_START, { conversationId });
    }
  }, []);

  const sendTypingStop = useCallback((conversationId: string) => {
    if (socketRef.current?.connected && conversationId) {
      socketRef.current.emit(SOCKET_EVENTS.TYPING_STOP, { conversationId });
    }
  }, []);

  const joinConversation = useCallback((conversationId: string) => {
    if (socketRef.current?.connected && conversationId) {
      socketRef.current.emit(SOCKET_EVENTS.CONVERSATION_JOIN, { conversationId });
    }
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    if (socketRef.current?.connected && conversationId) {
      socketRef.current.emit(SOCKET_EVENTS.CONVERSATION_LEAVE, { conversationId });
    }
  }, []);

  const value: SocketContextValue = {
    socket: socketRef.current,
    isConnected,
    onlineUserIds,
    typingUsers,
    isUserOnline,
    sendTypingStart,
    sendTypingStop,
    joinConversation,
    leaveConversation,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
