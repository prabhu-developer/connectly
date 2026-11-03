"use client";

import React from "react";
import { useAuthSession } from "../features/auth/hooks/useAuthSession";
import { ChatShell } from "../features/chat/components/ChatShell";
import { SidebarSkeleton, ChatViewSkeleton } from "../features/chat/components/ChatSkeleton";

export default function HomePage() {
  const { isLoading } = useAuthSession();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <div className="hidden md:block w-80 lg:w-96 shrink-0 h-full">
          <SidebarSkeleton />
        </div>
        <div className="flex-1 h-full">
          <ChatViewSkeleton />
        </div>
      </div>
    );
  }

  return <ChatShell />;
}
