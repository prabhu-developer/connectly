"use client";

import React, { useState, useEffect } from "react";
import { ConversationSidebar } from "./ConversationSidebar";
import { ActiveConversationView } from "./ActiveConversationView";
import { EmptyState } from "./EmptyState";
import { useAuthSession } from "../../auth/hooks/useAuthSession";
import { useConversations } from "../hooks/useConversations";
import { useChatMessages } from "../hooks/useChatMessages";
import { CURRENT_USER_MOCK } from "../constants/mock-data";
import type { ConversationSummary, ChatParticipant, ChatMessage } from "../types/chat";

export function ChatShell() {
  const { user } = useAuthSession();
  const currentUserId = user?.id || CURRENT_USER_MOCK.id;

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const {
    conversations: liveConversations,
    startConversationWithUser,
  } = useConversations(selectedConversationId);

  // Auto-select first conversation once loaded if none is selected on desktop
  useEffect(() => {
    if (!selectedConversationId && liveConversations.length > 0) {
      const firstId = liveConversations[0]?.id;
      if (firstId && typeof window !== "undefined" && window.innerWidth >= 768) {
        setSelectedConversationId(firstId);
      }
    }
  }, [liveConversations, selectedConversationId]);

  const { messages: liveMessages, sendMessage } = useChatMessages(
    selectedConversationId,
    currentUserId
  );

  const selectedConversation = liveConversations.find(
    (c) => c.id === selectedConversationId
  );

  const handleStartNewConversation = async (recipientId: string) => {
    try {
      const conv = await startConversationWithUser(recipientId);
      setSelectedConversationId(conv.id);
    } catch {
      // Handled in modal
    }
  };

  const adaptedParticipant: ChatParticipant | undefined = selectedConversation
    ? {
        id: selectedConversation.participant.id,
        username: selectedConversation.participant.username,
        displayName: selectedConversation.participant.displayName,
        avatarUrl: selectedConversation.participant.avatarUrl,
        bio: selectedConversation.participant.bio,
        isOnline: false, // Updated dynamically via usePresence
        lastSeenAt: selectedConversation.participant.lastSeenAt,
      }
    : undefined;

  const adaptedConversations: ConversationSummary[] = liveConversations.map((c) => ({
    id: c.id,
    participant: {
      id: c.participant.id,
      username: c.participant.username,
      displayName: c.participant.displayName,
      avatarUrl: c.participant.avatarUrl,
      bio: c.participant.bio,
      isOnline: false,
      lastSeenAt: c.participant.lastSeenAt,
    },
    lastMessage: c.lastMessage
      ? {
          content: c.lastMessage.content,
          createdAt: c.lastMessage.createdAt,
          senderId: c.lastMessage.senderId,
          status: c.lastMessage.status as "sent" | "delivered" | "read",
        }
      : undefined,
    unreadCount: c.unreadCount,
    updatedAt: c.updatedAt,
  }));

  const adaptedMessages: ChatMessage[] = liveMessages.map((m) => ({
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    content: m.content,
    attachment: m.attachment,
    status: m.status,
    createdAt: m.createdAt,
    clientTempId: m.clientTempId,
  }));

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar: visible on desktop, or on mobile when no conversation is selected */}
      <div
        className={`h-full w-full md:w-80 lg:w-96 shrink-0 md:block ${
          selectedConversationId ? "hidden md:block" : "block"
        }`}
      >
        <ConversationSidebar
          conversations={adaptedConversations}
          selectedConversationId={selectedConversationId}
          onSelectConversation={(id) => setSelectedConversationId(id)}
          onStartNewConversation={handleStartNewConversation}
        />
      </div>

      {/* Main Chat Area: visible on desktop, or on mobile when a conversation is selected */}
      <main
        className={`h-full flex-1 md:block ${
          selectedConversationId ? "block" : "hidden md:block"
        }`}
      >
        {selectedConversation && adaptedParticipant ? (
          <ActiveConversationView
            conversationId={selectedConversation.id}
            participant={adaptedParticipant}
            messages={adaptedMessages}
            currentUserId={currentUserId}
            onSendMessage={sendMessage}
            onBack={() => setSelectedConversationId(null)}
          />
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}
