import React from "react";
import { Check, CheckCheck, Clock } from "lucide-react";
import type { ChatMessage } from "../types/chat";

interface MessageBubbleProps {
  message: ChatMessage;
  isCurrentUser: boolean;
}

function formatMessageTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function MessageBubble({ message, isCurrentUser }: MessageBubbleProps) {
  const formattedTime = formatMessageTime(message.createdAt);

  return (
    <div
      className={`flex w-full ${isCurrentUser ? "justify-end" : "justify-start"} my-1`}
      data-testid={`message-bubble-${message.id}`}
    >
      <div
        className={`relative max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm transition-colors ${
          isCurrentUser
            ? "bg-primary text-primary-foreground rounded-br-xs"
            : "bg-muted text-foreground rounded-bl-xs border border-border/50"
        }`}
      >
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>
        <div
          className={`mt-1 flex items-center justify-end gap-1 text-[11px] select-none ${
            isCurrentUser ? "text-primary-foreground/75" : "text-muted-foreground"
          }`}
        >
          <span>{formattedTime}</span>
          {isCurrentUser && (
            <span aria-label={`Status: ${message.status}`} className="inline-flex items-center">
              {message.status === "sending" && <Clock className="h-3 w-3 animate-pulse" />}
              {message.status === "sent" && <Check className="h-3 w-3" />}
              {message.status === "delivered" && <CheckCheck className="h-3 w-3" />}
              {message.status === "read" && (
                <CheckCheck className="h-3 w-3 text-sky-300 dark:text-sky-400" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

