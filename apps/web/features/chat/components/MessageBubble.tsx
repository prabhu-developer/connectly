"use client";

import React, { useState } from "react";
import { Check, CheckCheck, Clock, FileText, Download, X } from "lucide-react";
import type { ChatMessage } from "../types/chat";
import { formatFileSize } from "../types/chat";

interface MessageBubbleProps {
  message: ChatMessage;
  isCurrentUser: boolean;
}

function formatMessageTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function MessageBubble({ message, isCurrentUser }: MessageBubbleProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const formattedTime = formatMessageTime(message.createdAt);
  const { attachment } = message;

  return (
    <>
      <div
        className={`flex w-full ${isCurrentUser ? "justify-end" : "justify-start"} my-1`}
        data-testid={`message-bubble-${message.id}`}
      >
        <div
          className={`relative max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 shadow-sm transition-colors ${
            isCurrentUser
              ? "bg-primary text-primary-foreground rounded-br-xs"
              : "bg-muted text-foreground rounded-bl-xs border border-border/50"
          }`}
        >
          {/* Attachment Rendering */}
          {attachment && (
            <div className="mb-2 overflow-hidden rounded-lg">
              {attachment.type === "image" ? (
                <div className="relative group">
                  {/* Image Thumbnail */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={attachment.url}
                    alt={attachment.name || "Attached photo"}
                    onClick={() => setIsLightboxOpen(true)}
                    className="max-h-64 sm:max-h-80 w-auto rounded-lg object-cover cursor-pointer transition-opacity hover:opacity-95"
                    data-testid="attachment-image"
                  />
                </div>
              ) : (
                /* File Document Card */
                <a
                  href={`${attachment.url}?download=1`}
                  download={attachment.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-3 rounded-lg border p-2.5 transition-colors ${
                    isCurrentUser
                      ? "bg-primary-foreground/10 border-primary-foreground/20 hover:bg-primary-foreground/20 text-primary-foreground"
                      : "bg-background/80 border-border hover:bg-background text-foreground"
                  }`}
                  data-testid="attachment-file"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      isCurrentUser ? "bg-primary-foreground/20" : "bg-primary/10 text-primary"
                    }`}
                  >
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs sm:text-sm font-medium">{attachment.name}</p>
                    <p
                      className={`text-[11px] ${
                        isCurrentUser ? "text-primary-foreground/75" : "text-muted-foreground"
                      }`}
                    >
                      {formatFileSize(attachment.size)}
                    </p>
                  </div>
                  <div className="shrink-0 p-1">
                    <Download className="h-4 w-4" />
                  </div>
                </a>
              )}
            </div>
          )}

          {/* Text Content (if present) */}
          {message.content && (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {message.content}
            </p>
          )}

          {/* Time and Delivery Status Metadata */}
          <div
            className={`mt-1 flex items-center justify-end gap-1 text-[11px] select-none ${
              isCurrentUser ? "text-primary-foreground/75" : "text-muted-foreground"
            }`}
          >
            <span>{formattedTime}</span>
            {isCurrentUser && (
              <span aria-label={`Status: ${message.status}`} className="inline-flex items-center">
                {message.status === "sending" && <Clock className="h-3 w-3 animate-pulse" />}
                {message.status === "sent" && <Check className="h-3 w-3" />}
                {message.status === "delivered" && <CheckCheck className="h-3 w-3" />}
                {message.status === "read" && (
                  <CheckCheck className="h-3 w-3 text-sky-300 dark:text-sky-400" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Modal for Image Full-Screen View */}
      {isLightboxOpen && attachment?.type === "image" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
          onClick={() => setIsLightboxOpen(false)}
          data-testid="image-lightbox-modal"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -top-10 right-0 flex items-center gap-2">
              <a
                href={`${attachment.url}?download=1`}
                download={attachment.name}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                title="Download image"
              >
                <Download className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attachment.url}
              alt={attachment.name || "Full preview"}
              className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            />
            {attachment.name && (
              <span className="mt-2 text-xs text-white/80">{attachment.name}</span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
