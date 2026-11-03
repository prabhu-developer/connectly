import React from "react";
import { MessageSquareDashed } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
}

export function EmptyState({
  title = "No conversation selected",
  description = "Choose a contact from the sidebar to view messages or start a new conversation.",
}: EmptyStateProps) {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center p-8 text-center select-none"
      data-testid="chat-empty-state"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-muted/60 text-muted-foreground ring-8 ring-muted/20">
        <MessageSquareDashed className="h-10 w-10 stroke-[1.5]" />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-foreground tracking-tight">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

