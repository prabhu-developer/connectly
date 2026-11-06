"use client";

import React, { useState, useRef } from "react";
import { X, Camera, Loader2, Check, User, Info, Mail, AtSign } from "lucide-react";
import type { AuthUserDto } from "@repo/contracts/auth";
import { userApi } from "../../auth/services/user.api";
import { chatApi } from "../services/chat.api";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUserDto | null;
  onProfileUpdated: (updated: Partial<AuthUserDto>) => void;
}

const PRESET_STATUSES = [
  "Available",
  "Busy",
  "In a meeting",
  "At work",
  "Urgent calls only",
  "Sleeping",
];

export function ProfileModal({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
}: ProfileModalProps) {
  const [displayName, setDisplayName] = useState(currentUser?.displayName || "");
  const [bio, setBio] = useState(currentUser?.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || "");
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !currentUser) return null;

  const userInitial = (displayName || currentUser.username || "U").charAt(0).toUpperCase();

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setFeedback({ type: "error", text: "Image size cannot exceed 10MB" });
      return;
    }

    try {
      setIsSaving(true);
      setFeedback(null);
      const uploaded = await chatApi.uploadMedia(file);
      setAvatarUrl(uploaded.url);
      setFeedback({ type: "success", text: "Photo uploaded. Click Save to apply changes." });
    } catch {
      setFeedback({ type: "error", text: "Failed to upload avatar image" });
    } finally {
      setIsSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setFeedback({ type: "error", text: "Display name cannot be empty" });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const updated = await userApi.updateProfile({
        displayName: trimmedName,
        bio: bio.trim(),
        avatarUrl: avatarUrl ? avatarUrl.trim() : null,
      });

      onProfileUpdated({
        displayName: updated.displayName,
        bio: updated.bio,
        avatarUrl: updated.avatarUrl,
      });

      setFeedback({ type: "success", text: "Profile updated successfully!" });
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update profile";
      setFeedback({ type: "error", text: msg });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      data-testid="profile-modal"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h2 id="profile-modal-title" className="text-lg font-semibold text-foreground">
            Edit Profile
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile modal"
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mt-4 flex items-center gap-2 rounded-lg p-3 text-xs font-medium ${
              feedback.type === "success"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 text-destructive"
            }`}
            role="alert"
          >
            {feedback.type === "success" ? (
              <Check className="h-4 w-4 shrink-0" />
            ) : (
              <Info className="h-4 w-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Profile Form */}
        <form onSubmit={handleSave} className="mt-4 space-y-4">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative group">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-primary/10 text-primary font-bold text-2xl select-none shadow-inner">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={displayName || "User avatar"}
                    className="h-full w-full object-cover"
                    data-testid="profile-avatar-preview"
                  />
                ) : (
                  <span>{userInitial}</span>
                )}
              </div>

              {/* Camera upload overlay button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSaving}
                title="Change avatar photo"
                aria-label="Change avatar photo"
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarFileChange}
              className="hidden"
              data-testid="avatar-file-input"
            />

            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl("")}
                className="text-[11px] text-muted-foreground hover:text-destructive underline"
              >
                Remove photo
              </button>
            )}
          </div>

          {/* Display Name Input */}
          <div>
            <label
              htmlFor="profile-display-name"
              className="block text-xs font-semibold text-foreground mb-1"
            >
              Display Name
            </label>
            <div className="relative flex items-center">
              <User className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                id="profile-display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
                required
                className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Your name"
                data-testid="profile-display-name-input"
              />
            </div>
          </div>

          {/* About / Bio Status */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="profile-bio"
                className="block text-xs font-semibold text-foreground"
              >
                About / Status
              </label>
              <span className="text-[11px] text-muted-foreground">
                {bio.length}/160
              </span>
            </div>
            <textarea
              id="profile-bio"
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={160}
              placeholder="What's on your mind?"
              className="w-full resize-none rounded-lg border border-input bg-background p-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid="profile-bio-input"
            />

            {/* Quick status presets */}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {PRESET_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setBio(status)}
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ${
                    bio === status
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Read-Only Account Info */}
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <AtSign className="h-3.5 w-3.5" /> Username
              </span>
              <span className="font-mono text-foreground font-medium">@{currentUser.username}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Email
              </span>
              <span className="text-foreground">{currentUser.email}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-5 flex items-center justify-end gap-2 border-t border-border/60 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !displayName.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
              data-testid="save-profile-button"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
