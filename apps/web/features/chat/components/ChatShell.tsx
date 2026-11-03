"use client";

import React, { useState } from "react";
import { ConversationSidebar } from "./ConversationSidebar";
import { ActiveConversationView } from "./ActiveConversationView";
import { EmptyState } from "./EmptyState";
import { useAuthSession } from "../../auth/hooks/useAuthSession";
import {
  MOCK_CONVERSATIONS,
  MOCK_MESSAGES,
  CURRENT_USER_MOCK,
} from "../constants/mock-data";
import type { ChatMessage, ConversationSummary } from "../types/chat";

export function ChatShell() {
  const { user } = useAuthSession();
  const currentUserId = user?.id || CURRENT_USER_MOCK.id;

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>("conv-1");
  const [conversations, setConversations] = useState<ConversationSummary[]>(MOCK_CONVERSATIONS);
  const [messagesMap, setMessagesMap] =
    useState<Record<string, ChatMessage[]>>(MOCK_MESSAGES);

  const selectedConversation = conversations.find(
    (c) => c.id === selectedConversationId
  );
  const activeMessages = selectedConversationId
    ? messagesMap[selectedConversationId] || []
    : [];

  const handleSendMessage = (content: string) => {
    if (!selectedConversationId) return;

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      conversationId: selectedConversationId,
      senderId: currentUserId,
      content,
      status: "sent",
      createdAt: new Date().toISOString(),
    };

    // Update messages map
    setMessagesMap((prev) => ({
      ...prev,
      [selectedConversationId]: [...(prev[selectedConversationId] || []), newMessage],
    }));

    // Update conversation summary with new last message
    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === selectedConversationId) {
          return {
            ...conv,
            lastMessage: {
              content,
              createdAt: newMessage.createdAt,
              senderId: currentUserId,
              status: "sent",
            },
            updatedAt: newMessage.createdAt,
          };
        }
        return conv;
      })
    );
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    // Mark unread as 0 when conversation is opened
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
    );
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar: visible on desktop, or on mobile when no conversation is selected */}
      <div
        className={`h-full w-full md:w-80 lg:w-96 shrink-0 md:block ${
          selectedConversationId ? "hidden md:block" : "block"
        }`}
      >
        <ConversationSidebar
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
        />
      </div>

      {/* Main Chat Area: visible on desktop, or on mobile when a conversation is selected */}
      <main
        className={`h-full flex-1 md:block ${
          selectedConversationId ? "block" : "hidden md:block"
        }`}
      >
        {selectedConversation ? (
          <ActiveConversationView
            participant={selectedConversation.participant}
            messages={activeMessages}
            currentUserId={currentUserId}
            onSendMessage={handleSendMessage}
            onBack={() => setSelectedConversationId(null)}
          />
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}

