import React, { useContext, useState } from "react";
import { Check, CheckCheck, Trash2 } from "lucide-react";
import { SocketContext } from "../context/SocketContext";
import type { ConversationSummary } from "../types/chat";

interface ConversationListProps {
  conversations: ConversationSummary[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation?: (id: string) => void;
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
  onDeleteConversation,
  searchQuery = "",
}: ConversationListProps) {
  const socketCtx = useContext(SocketContext);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

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

        const isOnline = socketCtx
          ? socketCtx.isUserOnline(conv.participant.id) || conv.participant.isOnline
          : conv.participant.isOnline;

        return (
          <li key={conv.id} role="option" aria-selected={isSelected}>
            <button
              type="button"
              onClick={() => onSelectConversation(conv.id)}
              className={`group/conv flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isSelected
                  ? "bg-accent text-accent-foreground font-medium"
                  : "hover:bg-muted/70 text-foreground"
              }`}
            >
              {/* Avatar with Presence Indicator */}
              <div className="relative shrink-0">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary font-semibold text-base select-none">
                  {conv.participant.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={conv.participant.avatarUrl}
                      alt={conv.participant.displayName || conv.participant.username}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{initial}</span>
                  )}
                </div>
                {isOnline && (
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

                  <div className="flex items-center gap-1.5 shrink-0">
                    {conv.unreadCount > 0 && (
                      <span
                        aria-label={`${conv.unreadCount} unread messages`}
                        className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground"
                      >
                        {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                      </span>
                    )}

                    {onDeleteConversation && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTargetId(conv.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                            setDeleteTargetId(conv.id);
                          }
                        }}
                        title="Delete chat"
                        aria-label={`Delete chat with ${conv.participant.displayName || conv.participant.username}`}
                        className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover/conv:opacity-100 focus:opacity-100"
                        data-testid={`delete-conversation-${conv.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          </li>
        );
      })}

      {/* Delete Conversation Confirmation Modal from List */}
      {deleteTargetId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          data-testid="list-delete-conversation-modal"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-foreground">Delete Chat?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to delete this entire conversation? All messages, documents, and attachments will be permanently removed.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 rounded-lg border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
                data-testid="cancel-list-delete-conversation"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteConversation && deleteTargetId) {
                    onDeleteConversation(deleteTargetId);
                  }
                  setDeleteTargetId(null);
                }}
                className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors"
                data-testid="confirm-list-delete-conversation"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </ul>
  );
}

