import React from "react";
import { Check, CheckCheck } from "lucide-react";
import type { ConversationSummary } from "../types/chat";

interface ConversationListProps {
  conversations: ConversationSummary[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  searchQuery?: string;
}

function formatConversationDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
      return "Yesterday";
    }

    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  searchQuery = "",
}: ConversationListProps) {
  const filtered = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchName =
      c.participant.displayName?.toLowerCase().includes(q) ||
      c.participant.username.toLowerCase().includes(q);
    const matchMessage = c.lastMessage?.content.toLowerCase().includes(q);
    return matchName || matchMessage;
  });

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground select-none">
        <p className="text-sm font-medium">
          {searchQuery ? "No matching conversations" : "No conversations yet"}
        </p>
        <p className="text-xs text-muted-foreground/75 mt-1">
          {searchQuery ? "Try searching for a different name" : "Your active chats will appear here"}
        </p>
      </div>
    );
  }

  return (
    <ul className="flex-1 space-y-1 overflow-y-auto p-2" role="listbox" aria-label="Conversations">
      {filtered.map((conv) => {
        const isSelected = conv.id === selectedConversationId;
        const initial = (conv.participant.displayName || conv.participant.username)
          .charAt(0)
          .toUpperCase();
        const dateStr = conv.lastMessage?.createdAt
          ? formatConversationDate(conv.lastMessage.createdAt)
          : "";

        return (
          <li key={conv.id} role="option" aria-selected={isSelected}>
            <button
              type="button"
              onClick={() => onSelectConversation(conv.id)}
              className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isSelected
                  ? "bg-accent text-accent-foreground font-medium"
                  : "hover:bg-muted/70 text-foreground"
              }`}
            >
              {/* Avatar with Presence Indicator */}
              <div className="relative shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-base select-none">
                  {initial}
                </div>
                {conv.participant.isOnline && (
                  <span
                    title="Online"
                    className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-background bg-emerald-500"
                    aria-label="Online"
                  />
                )}
              </div>

              {/* Conversation Info */}
              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-sm font-semibold">
                    {conv.participant.displayName || conv.participant.username}
                  </span>
                  {dateStr && (
                    <span className="text-[11px] text-muted-foreground shrink-0">{dateStr}</span>
                  )}
                </div>

                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-muted-foreground flex items-center gap-1">
                    {conv.lastMessage && conv.lastMessage.status && (
                      <span className="shrink-0 inline-flex items-center">
                        {conv.lastMessage.status === "sent" && <Check className="h-3 w-3" />}
                        {conv.lastMessage.status === "delivered" && (
                          <CheckCheck className="h-3 w-3" />
                        )}
                        {conv.lastMessage.status === "read" && (
                          <CheckCheck className="h-3 w-3 text-sky-500" />
                        )}
                      </span>
                    )}
                    <span className="truncate">
                      {conv.lastMessage?.content || "No messages yet"}
                    </span>
                  </p>

                  {conv.unreadCount > 0 && (
                    <span
                      aria-label={`${conv.unreadCount} unread messages`}
                      className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground"
                    >
                      {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

