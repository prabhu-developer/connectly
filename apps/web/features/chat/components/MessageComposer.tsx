"use client";

import React, { useState, useRef, useEffect } from "react";
import { SendHorizontal, Paperclip, X, Image as ImageIcon, FileText, Loader2 } from "lucide-react";
import type { AttachmentDto } from "@repo/contracts/chat";
import { chatApi } from "../services/chat.api";
import { formatFileSize } from "../types/chat";

interface MessageComposerProps {
  onSendMessage: (content?: string, attachment?: AttachmentDto) => void;
  onTyping?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageComposer({
  onSendMessage,
  onTyping,
  disabled = false,
  placeholder = "Type a message...",
}: MessageComposerProps) {
  const [content, setContent] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<AttachmentDto | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSend = !disabled && !isUploading && (content.trim().length > 0 || !!pendingAttachment);

  const handleSend = () => {
    if (!canSend) return;
    const trimmed = content.trim();
    if (pendingAttachment) {
      onSendMessage(trimmed || undefined, pendingAttachment);
    } else {
      onSendMessage(trimmed);
    }
    setContent("");
    setPendingAttachment(null);
    setUploadError(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB for images, 10MB for documents)
    const isImage = file.type.startsWith("image/");
    if (isImage && file.size > 5 * 1024 * 1024) {
      setUploadError("Image file size exceeds 5MB limit");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (!isImage && file.size > 10 * 1024 * 1024) {
      setUploadError("File size exceeds 10MB limit");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const uploaded = await chatApi.uploadMedia(file);
      setPendingAttachment(uploaded);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload file";
      setUploadError(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [content]);

  return (
    <div className="flex flex-col border-t border-border bg-card">
      {/* Uploading or Attachment Preview Bar */}
      {(isUploading || pendingAttachment || uploadError) && (
        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
          {isUploading && (
            <div
              className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground"
              data-testid="attachment-uploading"
            >
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Uploading attachment...</span>
            </div>
          )}

          {pendingAttachment && !isUploading && (
            <div
              className="flex items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-1.5 text-xs text-foreground"
              data-testid="attachment-preview"
            >
              {pendingAttachment.type === "image" ? (
                <ImageIcon className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <FileText className="h-4 w-4 text-primary shrink-0" />
              )}
              <span className="max-w-[200px] truncate font-medium">
                {pendingAttachment.name}
              </span>
              <span className="text-muted-foreground text-[11px]">
                ({formatFileSize(pendingAttachment.size)})
              </span>
              <button
                type="button"
                onClick={() => setPendingAttachment(null)}
                className="ml-1 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Remove attachment"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {uploadError && (
            <div
              className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs text-destructive"
              role="alert"
            >
              <span>{uploadError}</span>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="rounded-full p-0.5 hover:bg-destructive/20"
                aria-label="Dismiss error"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Composer Controls */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-end gap-2 p-3 sm:p-4"
        aria-label="Message composer"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileChange}
          className="hidden"
          aria-label="File attachment input"
          data-testid="file-attachment-input"
        />

        <button
          type="button"
          onClick={handleFileClick}
          disabled={disabled || isUploading}
          title="Attach file or photo"
          aria-label="Attach file"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          <Paperclip className="h-5 w-5" />
        </button>

        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              onTyping?.();
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            aria-label="Message content"
            className="max-h-[120px] w-full resize-none rounded-2xl border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
        >
          <SendHorizontal className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
