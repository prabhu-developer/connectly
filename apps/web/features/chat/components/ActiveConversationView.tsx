"use client";

import React, { useState, useEffect, useRef, useContext } from "react";
import { ArrowLeft, Search, X, Loader2, Trash2 } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";
import { ParticipantProfileModal } from "./ParticipantProfileModal";
import { SocketContext } from "../context/SocketContext";
import { usePresence } from "../hooks/usePresence";
import { useTypingIndicator } from "../hooks/useTypingIndicator";
import { chatApi } from "../services/chat.api";
import type { ChatMessage, ChatParticipant } from "../types/chat";
import type { AttachmentDto, MessageSearchResultDto } from "@repo/contracts/chat";

interface ActiveConversationViewProps {
  conversationId?: string;
  participant: ChatParticipant;
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (content?: string, attachment?: AttachmentDto) => void;
  onDeleteMessage?: (messageId: string) => void;
  onDeleteConversation?: (conversationId: string) => void;
  onBack?: () => void;
}

export function ActiveConversationView({
  conversationId,
  participant,
  messages,
  currentUserId,
  onSendMessage,
  onDeleteMessage,
  onDeleteConversation,
  onBack,
}: ActiveConversationViewProps) {
  const [isContactInfoOpen, setIsContactInfoOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showDeleteConvModal, setShowDeleteConvModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MessageSearchResultDto[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketCtx = useContext(SocketContext);

  const { isOnline, statusText } = usePresence(participant);
  const { typingIndicatorText, onUserKeypress, stopTypingImmediate } =
    useTypingIndicator(conversationId);

  // Manage room subscription
  useEffect(() => {
    if (!conversationId || !socketCtx) return;

    socketCtx.joinConversation(conversationId);

    return () => {
      socketCtx.leaveConversation(conversationId);
    };
  }, [conversationId, socketCtx]);

  useEffect(() => {
    if (!isSearchOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isSearchOpen]);

  const participantInitial = (participant.displayName || participant.username)
    .charAt(0)
    .toUpperCase();

  const handleSend = (content?: string, attachment?: AttachmentDto) => {
    stopTypingImmediate();
    onSendMessage(content, attachment);
  };

  const handleSearchChange = async (query: string) => {
    setSearchQuery(query);
    const trimmed = query.trim();
    if (!trimmed || !conversationId) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const results = await chatApi.searchMessages(conversationId, trimmed);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const scrollToMessage = (messageId: string) => {
    const elem = document.querySelector(`[data-testid="message-bubble-${messageId}"]`);
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth", block: "center" });
      elem.classList.add("ring-2", "ring-primary", "rounded-2xl");
      setTimeout(() => {
        elem.classList.remove("ring-2", "ring-primary", "rounded-2xl");
      }, 2000);
    }
  };

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

          <button
            type="button"
            onClick={() => setIsContactInfoOpen(true)}
            title="View contact info"
            aria-label="View contact info"
            className="flex items-center gap-3 text-left rounded-lg p-1 -ml-1 transition-colors hover:bg-muted/60"
            data-testid="contact-info-trigger"
          >
            <div className="relative shrink-0">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary font-semibold text-sm select-none">
                {participant.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={participant.avatarUrl}
                    alt={participant.displayName || participant.username}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{participantInitial}</span>
                )}
              </div>
              {isOnline && (
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
                {typingIndicatorText ? (
                  <span className="text-primary font-medium italic animate-pulse">
                    {typingIndicatorText}
                  </span>
                ) : isOnline ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Online</span>
                ) : (
                  statusText
                )}
              </p>
            </div>
          </button>
        </div>

        {/* Right Action Icons: Search in Conversation & Delete Chat */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsSearchOpen(!isSearchOpen);
              if (isSearchOpen) {
                setSearchQuery("");
                setSearchResults([]);
              }
            }}
            title="Search messages in conversation"
            aria-label="Search messages"
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isSearchOpen
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            data-testid="conversation-search-button"
          >
            <Search className="h-4 w-4" />
          </button>

          {onDeleteConversation && conversationId && (
            <button
              type="button"
              onClick={() => setShowDeleteConvModal(true)}
              title="Delete entire chat"
              aria-label="Delete entire chat"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid="delete-conversation-button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* In-Conversation Message Search Panel */}
      {isSearchOpen && (
        <div className="border-b border-border bg-card px-4 py-2" data-testid="conversation-search-panel">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => void handleSearchChange(e.target.value)}
                placeholder="Search messages in this conversation..."
                autoFocus
                className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-8 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="conversation-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {isSearching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}

            {searchQuery && !isSearching && (
              <span className="text-xs text-muted-foreground shrink-0" data-testid="search-results-count">
                {searchResults.length === 1 ? "1 match" : `${searchResults.length} matches`}
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                setIsSearchOpen(false);
                setSearchQuery("");
                setSearchResults([]);
              }}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close search"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search Results Matches Dropdown */}
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border bg-muted/40 p-1.5 space-y-1" data-testid="conversation-search-results">
              {searchResults.map((res) => (
                <button
                  key={res.message.id}
                  type="button"
                  onClick={() => scrollToMessage(res.message.id)}
                  className="flex w-full items-center justify-between rounded-md p-2 text-left text-xs transition-colors hover:bg-background"
                >
                  <span className="truncate max-w-[75%] font-medium text-foreground">
                    {res.matchSnippet}
                  </span>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {new Date(res.message.createdAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </button>
              ))}
            </div>
          )}

          {searchQuery && !isSearching && searchResults.length === 0 && (
            <p className="mt-2 text-center text-xs text-muted-foreground py-1" data-testid="search-no-results">
              No messages found matching &ldquo;{searchQuery}&rdquo;
            </p>
          )}
        </div>
      )}

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
              onDelete={onDeleteMessage}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <MessageComposer onSendMessage={handleSend} onTyping={onUserKeypress} />

      {/* Contact Profile Modal */}
      <ParticipantProfileModal
        isOpen={isContactInfoOpen}
        onClose={() => setIsContactInfoOpen(false)}
        participant={participant}
        isOnline={isOnline}
        statusText={statusText}
      />

      {/* Delete Conversation Confirmation Modal */}
      {showDeleteConvModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          data-testid="delete-conversation-modal"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Delete Chat?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to delete this chat with{" "}
              <span className="font-semibold text-foreground">
                {participant.displayName || participant.username}
              </span>
              ? All messages, documents, and media attachments will be permanently deleted.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConvModal(false)}
                className="px-4 py-2 rounded-lg border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
                data-testid="cancel-delete-conversation"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConvModal(false);
                  if (conversationId && onDeleteConversation) {
                    onDeleteConversation(conversationId);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors"
                data-testid="confirm-delete-conversation"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
