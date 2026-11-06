"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "../features/auth/hooks/useAuthSession";
import { ChatShell } from "../features/chat/components/ChatShell";
import { SidebarSkeleton, ChatViewSkeleton } from "../features/chat/components/ChatSkeleton";

export default function HomePage() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuthSession();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
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
