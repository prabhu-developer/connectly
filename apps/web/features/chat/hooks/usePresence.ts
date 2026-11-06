"use client";

import { useContext } from "react";
import { SocketContext } from "../context/SocketContext";
import type { ChatParticipant } from "../types/chat";

export function formatLastSeen(isoString?: string): string {
  if (!isoString) return "Offline";
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return "Last seen just now";
    if (diffMinutes < 60) return `Last seen ${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Last seen ${diffHours}h ago`;

    return `Last seen ${date.toLocaleDateString([], { month: "short", day: "numeric" })}`;
  } catch {
    return "Offline";
  }
}

export function usePresence(participant?: ChatParticipant) {
  const socketCtx = useContext(SocketContext);

  if (!participant) {
    return { isOnline: false, statusText: "Offline" };
  }

  const isOnline = (socketCtx?.isUserOnline(participant.id) ?? false) || participant.isOnline;
  const statusText = isOnline ? "Online" : formatLastSeen(participant.lastSeenAt);

  return { isOnline, statusText };
}
