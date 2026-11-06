"use client";

import { useContext, useEffect, useRef, useCallback } from "react";
import { SocketContext } from "../context/SocketContext";

const TYPING_TIMEOUT_MS = 2500;

export function useTypingIndicator(conversationId?: string | null) {
  const socketCtx = useContext(SocketContext);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Active typing usernames in this conversation
  const usersTyping =
    conversationId && socketCtx?.typingUsers[conversationId]
      ? socketCtx.typingUsers[conversationId]
      : [];

  const stopTypingImmediate = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (isTypingRef.current && conversationId && socketCtx) {
      socketCtx.sendTypingStop(conversationId);
      isTypingRef.current = false;
    }
  }, [conversationId, socketCtx]);

  const onUserKeypress = useCallback(() => {
    if (!conversationId || !socketCtx) return;

    if (!isTypingRef.current) {
      socketCtx.sendTypingStart(conversationId);
      isTypingRef.current = true;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      stopTypingImmediate();
    }, TYPING_TIMEOUT_MS);
  }, [conversationId, socketCtx, stopTypingImmediate]);

  useEffect(() => {
    return () => {
      stopTypingImmediate();
    };
  }, [stopTypingImmediate]);

  let typingIndicatorText = "";
  if (usersTyping.length === 1) {
    typingIndicatorText = `${usersTyping[0]} is typing...`;
  } else if (usersTyping.length === 2) {
    typingIndicatorText = `${usersTyping[0]} and ${usersTyping[1]} are typing...`;
  } else if (usersTyping.length > 2) {
    typingIndicatorText = "Several people are typing...";
  }

  return {
    usersTyping,
    typingIndicatorText,
    onUserKeypress,
    stopTypingImmediate,
  };
}
