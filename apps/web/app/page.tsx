"use client";

import React from "react";
import Link from "next/link";
import { useAuthSession } from "../features/auth/hooks/useAuthSession";

export default function HomePage() {
  const { user, isLoading, isAuthenticated, logout } = useAuthSession();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-secondary/20 text-foreground">
      <div className="w-full max-w-lg bg-card text-card-foreground p-8 rounded-2xl shadow-xl border border-border">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-xl">
            C
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Connectly</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              Private Real-Time Messaging
            </p>
          </div>
        </div>

        {isAuthenticated && user ? (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-secondary/50 border border-border flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-lg uppercase border border-primary/30">
                {user.displayName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-foreground truncate">{user.displayName}</h2>
                <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Active
              </div>
            </div>

            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Authentication Verified</p>
              <p>
                Dual-token JWT session established with secure rotating refresh cookie.
                Ready for Phase 04 (Chat UI).
              </p>
            </div>

            <button
              onClick={() => logout()}
              className="w-full py-2.5 px-4 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive font-semibold border border-destructive/20 transition active:scale-[0.99]"
            >
              Log Out
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-muted-foreground text-sm leading-relaxed">
              Experience fast, private, one-to-one real-time messaging with online presence,
              typing indicators, read receipts, and media sharing.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/login"
                className="flex-1 py-2.5 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-center hover:opacity-90 transition active:scale-[0.99]"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="flex-1 py-2.5 px-4 rounded-lg bg-secondary text-secondary-foreground font-semibold text-center hover:bg-secondary/80 border border-border transition active:scale-[0.99]"
              >
                Create Account
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
