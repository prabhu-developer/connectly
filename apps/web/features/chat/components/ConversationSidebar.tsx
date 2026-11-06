"use client";

import React, { useState } from "react";
import { Search, LogOut, X, UserPlus, Settings } from "lucide-react";
import { ThemeToggle } from "../../../components/theme-toggle";
import { useAuthSession } from "../../auth/hooks/useAuthSession";
import { ConversationList } from "./ConversationList";
import { NewChatModal } from "./NewChatModal";
import { ProfileModal } from "./ProfileModal";
import { SettingsModal } from "./SettingsModal";
import type { ConversationSummary } from "../types/chat";

interface ConversationSidebarProps {
  conversations: ConversationSummary[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onStartNewConversation?: (recipientId: string) => void;
  onDeleteConversation?: (conversationId: string) => void;
}

export function ConversationSidebar({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onStartNewConversation,
  onDeleteConversation,
}: ConversationSidebarProps) {
  const { user, logout, updateUser } = useAuthSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const userInitial = (user?.displayName || user?.username || "U").charAt(0).toUpperCase();

  const handleSelectRecipient = (recipientId: string) => {
    onStartNewConversation?.(recipientId);
  };

  return (
    <aside
      className="flex h-full w-full flex-col border-r border-border bg-card"
      aria-label="Chat sidebar"
    >
      {/* Profile Header */}
      <div className="flex h-16 items-center justify-between border-b border-border px-4 py-2">
        <button
          type="button"
          onClick={() => setIsProfileOpen(true)}
          title="View and edit profile"
          aria-label="Edit your profile"
          className="flex items-center gap-3 overflow-hidden text-left rounded-lg p-1 -ml-1 transition-colors hover:bg-muted/60"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground font-semibold text-sm select-none shadow-xs">
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.displayName || user.username}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{userInitial}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-foreground">
              {user?.displayName || user?.username || "User"}
            </h2>
            <p className="truncate text-xs text-muted-foreground">@{user?.username || "connectly"}</p>
          </div>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsNewChatOpen(true)}
            title="Start new conversation"
            aria-label="Start new conversation"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <UserPlus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            title="Settings & preferences"
            aria-label="Open settings"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="sidebar-settings-button"
          >
            <Settings className="h-4 w-4" />
          </button>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => void logout()}
            title="Log out"
            aria-label="Log out"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-border/60">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            aria-label="Search conversations"
            className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-8 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute right-2.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Conversations List */}
      <ConversationList
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        onSelectConversation={onSelectConversation}
        onDeleteConversation={onDeleteConversation}
        searchQuery={searchQuery}
      />

      {/* New Conversation Modal */}
      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        onSelectUser={handleSelectRecipient}
      />

      {/* Current User Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={user}
        onProfileUpdated={updateUser}
      />

      {/* Settings & Preferences Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </aside>
  );
}
