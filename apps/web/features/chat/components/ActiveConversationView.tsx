"use client";

import React, { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";
import type { ChatMessage, ChatParticipant } from "../types/chat";

interface ActiveConversationViewProps {
  participant: ChatParticipant;
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (content: string) => void;
  onBack?: () => void;
}

function formatLastSeen(isoString?: string): string {
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

export function ActiveConversationView({
  participant,
  messages,
  currentUserId,
  onSendMessage,
  onBack,
}: ActiveConversationViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const participantInitial = (participant.displayName || participant.username)
    .charAt(0)
    .toUpperCase();

  return (
    <div
      className="flex h-full w-full flex-col bg-background"
      data-testid="active-conversation-view"
    >
      {/* Conversation Header */}
      <div className="flex h-16 items-center justify-between border-b border-border bg-card px-4 py-2">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to conversations"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}

          <div className="relative shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm select-none">
              {participantInitial}
            </div>
            {participant.isOnline && (
              <span
                title="Online"
                className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-emerald-500"
                aria-label="Online"
              />
            )}
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {participant.displayName || participant.username}
            </h3>
            <p className="text-xs text-muted-foreground">
              {participant.isOnline ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Online</span>
              ) : (
                formatLastSeen(participant.lastSeenAt)
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Message Stream */}
      <div
        className="flex-1 overflow-y-auto p-4"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-muted-foreground select-none">
            <p className="text-sm">No messages yet. Send a message to start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isCurrentUser={message.senderId === currentUserId}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <MessageComposer onSendMessage={onSendMessage} />
    </div>
  );
}

