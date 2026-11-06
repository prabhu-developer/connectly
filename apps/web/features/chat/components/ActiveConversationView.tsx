"use client";

import React, { useState, useEffect, useRef, useContext } from "react";
import { ArrowLeft } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";
import { ParticipantProfileModal } from "./ParticipantProfileModal";
import { SocketContext } from "../context/SocketContext";
import { usePresence } from "../hooks/usePresence";
import { useTypingIndicator } from "../hooks/useTypingIndicator";
import type { ChatMessage, ChatParticipant } from "../types/chat";
import type { AttachmentDto } from "@repo/contracts/chat";

interface ActiveConversationViewProps {
  conversationId?: string;
  participant: ChatParticipant;
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (content?: string, attachment?: AttachmentDto) => void;
  onBack?: () => void;
}

export function ActiveConversationView({
  conversationId,
  participant,
  messages,
  currentUserId,
  onSendMessage,
  onBack,
}: ActiveConversationViewProps) {
  const [isContactInfoOpen, setIsContactInfoOpen] = useState(false);
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const participantInitial = (participant.displayName || participant.username)
    .charAt(0)
    .toUpperCase();

  const handleSend = (content?: string, attachment?: AttachmentDto) => {
    stopTypingImmediate();
    onSendMessage(content, attachment);
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
      <MessageComposer onSendMessage={handleSend} onTyping={onUserKeypress} />

      {/* Contact Profile Modal */}
      <ParticipantProfileModal
        isOpen={isContactInfoOpen}
        onClose={() => setIsContactInfoOpen(false)}
        participant={participant}
        isOnline={isOnline}
        statusText={statusText}
      />
    </div>
  );
}
