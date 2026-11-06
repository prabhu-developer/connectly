"use client";

import React from "react";
import { X, AtSign, Info, Clock } from "lucide-react";
import type { ChatParticipant } from "../types/chat";
import { formatLastSeen } from "../hooks/usePresence";

interface ParticipantProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  participant: ChatParticipant;
  isOnline: boolean;
  statusText?: string;
}

export function ParticipantProfileModal({
  isOpen,
  onClose,
  participant,
  isOnline,
  statusText,
}: ParticipantProfileModalProps) {
  if (!isOpen) return null;

  const initial = (participant.displayName || participant.username).charAt(0).toUpperCase();
  const formattedLastSeen = participant.lastSeenAt
    ? formatLastSeen(participant.lastSeenAt)
    : "Offline";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="participant-profile-title"
      data-testid="participant-profile-modal"
    >
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h2 id="participant-profile-title" className="text-base font-semibold text-foreground">
            Contact Info
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close contact modal"
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Profile Card */}
        <div className="mt-4 flex flex-col items-center text-center">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-primary/10 text-primary font-bold text-2xl select-none shadow-inner">
              {participant.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={participant.avatarUrl}
                  alt={participant.displayName || participant.username}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{initial}</span>
              )}
            </div>
            {isOnline && (
              <span
                title="Online"
                className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full border-2 border-card bg-emerald-500"
                aria-label="Online"
              />
            )}
          </div>

          <h3 className="mt-3 text-base font-bold text-foreground">
            {participant.displayName || participant.username}
          </h3>
          <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground font-mono mt-0.5">
            <AtSign className="h-3 w-3" />
            {participant.username}
          </p>

          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 text-xs font-medium">
            {isOnline ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Online now</span>
            ) : (
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {statusText || formattedLastSeen}
              </span>
            )}
          </div>
        </div>

        {/* Status / Bio Section */}
        <div className="mt-5 rounded-lg border border-border/60 bg-muted/20 p-3 text-left">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1">
            <Info className="h-3.5 w-3.5" /> About
          </span>
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">
            {participant.bio?.trim() || "Hey there! I am using Connectly."}
          </p>
        </div>

        {/* Close Button */}
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
