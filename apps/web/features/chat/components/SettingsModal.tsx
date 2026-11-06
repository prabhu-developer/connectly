"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  X,
  Sun,
  Moon,
  Laptop,
  Volume2,
  Bell,
  CornerDownLeft,
  Loader2,
  Check,
} from "lucide-react";
import { userApi } from "../../auth/services/user.api";
import { playNotificationSound } from "../utils/sound";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChanged?: (settings: { enterToSend: boolean; soundEnabled: boolean }) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  onSettingsChanged,
}: SettingsModalProps) {
  const { theme, setTheme } = useTheme();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [enterToSend, setEnterToSend] = useState(true);
  const [desktopNotifications, setDesktopNotifications] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Load saved settings when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadSettings() {
      try {
        setIsLoading(true);
        const data = await userApi.getSettings();
        if (isMounted) {
          setSoundEnabled(data.soundEnabled);
          setEnterToSend(data.enterToSend);
          setDesktopNotifications(data.desktopNotifications);
          if (data.theme) {
            setTheme(data.theme);
          }
        }
      } catch {
        // Fallback to defaults
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSettings();
    return () => {
      isMounted = false;
    };
  }, [isOpen, setTheme]);

  if (!isOpen) return null;

  const handleToggleSound = async () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    if (nextVal) {
      playNotificationSound();
    }
    await syncSetting({ soundEnabled: nextVal });
    onSettingsChanged?.({ enterToSend, soundEnabled: nextVal });
  };

  const handleToggleEnterToSend = async () => {
    const nextVal = !enterToSend;
    setEnterToSend(nextVal);
    await syncSetting({ enterToSend: nextVal });
    onSettingsChanged?.({ enterToSend: nextVal, soundEnabled });
  };

  const handleToggleDesktopNotifications = async () => {
    if (!desktopNotifications && typeof window !== "undefined" && "Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setDesktopNotifications(true);
        await syncSetting({ desktopNotifications: true });
        return;
      }
    }
    const nextVal = !desktopNotifications;
    setDesktopNotifications(nextVal);
    await syncSetting({ desktopNotifications: nextVal });
  };

  const handleSelectTheme = async (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    await syncSetting({ theme: newTheme });
  };

  const syncSetting = async (update: {
    soundEnabled?: boolean;
    enterToSend?: boolean;
    desktopNotifications?: boolean;
    theme?: "light" | "dark" | "system";
  }) => {
    try {
      await userApi.updateSettings(update);
      setSaveFeedback("Saved");
      setTimeout(() => setSaveFeedback(null), 1500);
    } catch {
      // Ignored gracefully
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      data-testid="settings-modal"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <h2 id="settings-modal-title" className="text-lg font-semibold text-foreground">
              Settings & Preferences
            </h2>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {saveFeedback && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <Check className="h-3.5 w-3.5" /> {saveFeedback}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings modal"
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-6">
          {/* Appearance Section */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Theme & Appearance
            </h3>
            <div className="grid grid-cols-3 gap-2" data-testid="theme-selector-group">
              <button
                type="button"
                onClick={() => handleSelectTheme("light")}
                className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-medium transition-all ${
                  theme === "light"
                    ? "border-primary bg-primary/10 text-primary shadow-xs"
                    : "border-border bg-background hover:bg-muted text-muted-foreground"
                }`}
              >
                <Sun className="h-5 w-5" />
                <span>Light</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTheme("dark")}
                className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-medium transition-all ${
                  theme === "dark"
                    ? "border-primary bg-primary/10 text-primary shadow-xs"
                    : "border-border bg-background hover:bg-muted text-muted-foreground"
                }`}
              >
                <Moon className="h-5 w-5" />
                <span>Dark</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTheme("system")}
                className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-medium transition-all ${
                  theme === "system"
                    ? "border-primary bg-primary/10 text-primary shadow-xs"
                    : "border-border bg-background hover:bg-muted text-muted-foreground"
                }`}
              >
                <Laptop className="h-5 w-5" />
                <span>System</span>
              </button>
            </div>
          </div>

          {/* Notifications Section */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Notifications
            </h3>
            <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3.5">
              {/* Sound Notification Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Volume2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Message Sounds</p>
                    <p className="text-[11px] text-muted-foreground">Play a tone for incoming messages</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={soundEnabled}
                  onClick={handleToggleSound}
                  data-testid="toggle-sound"
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    soundEnabled ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${
                      soundEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Desktop Notifications Toggle */}
              <div className="flex items-center justify-between border-t border-border/50 pt-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Desktop Notifications</p>
                    <p className="text-[11px] text-muted-foreground">Show alerts on new incoming messages</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={desktopNotifications}
                  onClick={handleToggleDesktopNotifications}
                  data-testid="toggle-desktop-notifications"
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    desktopNotifications ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${
                      desktopNotifications ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Chat Input Behavior Section */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Chat Controls
            </h3>
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CornerDownLeft className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Press Enter to Send</p>
                  <p className="text-[11px] text-muted-foreground">
                    {enterToSend ? "Enter sends message, Shift+Enter adds newline" : "Shift+Enter or button sends message"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enterToSend}
                onClick={handleToggleEnterToSend}
                data-testid="toggle-enter-to-send"
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  enterToSend ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${
                    enterToSend ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end border-t border-border/60 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
