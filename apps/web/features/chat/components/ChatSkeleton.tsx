import React from "react";

export function SidebarSkeleton() {
  return (
    <div className="flex h-full w-full flex-col animate-pulse bg-card" data-testid="sidebar-skeleton">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-muted" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-24 rounded bg-muted" />
            <div className="h-2.5 w-16 rounded bg-muted" />
          </div>
        </div>
        <div className="h-8 w-8 rounded-md bg-muted" />
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="h-9 w-full rounded-md bg-muted" />
      </div>

      {/* List Items */}
      <div className="flex-1 space-y-2 p-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg p-3">
            <div className="h-11 w-11 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-28 rounded bg-muted" />
                <div className="h-2.5 w-10 rounded bg-muted" />
              </div>
              <div className="h-3 w-40 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChatViewSkeleton() {
  return (
    <div className="flex h-full w-full flex-col animate-pulse bg-background" data-testid="chat-view-skeleton">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-card p-4">
        <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3.5 w-32 rounded bg-muted" />
          <div className="h-2.5 w-16 rounded bg-muted" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 p-4">
        <div className="flex justify-start">
          <div className="h-12 w-48 rounded-2xl bg-muted" />
        </div>
        <div className="flex justify-end">
          <div className="h-16 w-56 rounded-2xl bg-muted" />
        </div>
        <div className="flex justify-start">
          <div className="h-14 w-64 rounded-2xl bg-muted" />
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-card p-3">
        <div className="h-10 w-full rounded-2xl bg-muted" />
      </div>
    </div>
  );
}

