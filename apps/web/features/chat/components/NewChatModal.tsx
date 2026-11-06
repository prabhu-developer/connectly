"use client";

import React, { useState, useEffect } from "react";
import { Search, UserPlus, X, Loader2 } from "lucide-react";
import { chatApi } from "../services/chat.api";
import type { UserSearchResultDto } from "@repo/contracts/chat";

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (userId: string) => void;
}

export function NewChatModal({ isOpen, onClose, onSelectUser }: NewChatModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResultDto[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      return;
    }

    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await chatApi.searchUsers(query.trim());
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <h2 id="modal-title" className="text-lg font-semibold text-foreground">
              New Conversation
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username or name..."
            autoFocus
            className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="mt-4 max-h-60 overflow-y-auto space-y-1">
          {isSearching && (
            <div className="flex items-center justify-center p-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Searching users...</span>
            </div>
          )}

          {!isSearching && query && results.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No users found matching &ldquo;{query}&rdquo;
            </p>
          )}

          {!isSearching && !query && (
            <p className="p-6 text-center text-xs text-muted-foreground">
              Type a username or display name to search for contacts
            </p>
          )}

          {!isSearching &&
            results.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  onSelectUser(u.id);
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-muted/80"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                  {u.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {u.displayName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
                </div>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
