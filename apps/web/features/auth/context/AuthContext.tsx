"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { AuthUserDto, LoginInput, RegisterInput } from "@repo/contracts/auth";
import { authApi } from "../services/auth.api";

const USER_STORAGE_KEY = "connectly_user";

interface AuthContextValue {
  user: AuthUserDto | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: Partial<AuthUserDto>) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Eagerly restore user from local storage on client to avoid flash of unauthenticated state
  const [user, setUser] = useState<AuthUserDto | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(USER_STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize and validate session on mount via silent token refresh
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const data = await authApi.refresh();
        if (isMounted) {
          setUser(data.user);
          try {
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
          } catch {
            // Storage quota or disabled storage - continue safely
          }
        }
      } catch (err: unknown) {
        // Only clear user state and storage if the session is genuinely invalid / expired (401)
        const isAuthError =
          (err && typeof err === "object" && "response" in err && (err as { response?: { status?: number } }).response?.status === 401) ||
          (err instanceof Error && (err.message.includes("401") || err.message.includes("Unauthorized") || err.message.includes("session") || err.message.includes("token")));

        if (isMounted && isAuthError) {
          setUser(null);
          try {
            localStorage.removeItem(USER_STORAGE_KEY);
          } catch {
            // Storage quota or disabled storage - continue safely
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await authApi.login(input);
      setUser(data.user);
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
      } catch {
        // Non-fatal
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: { message?: string } } } })
              .response?.data?.error?.message || "Failed to log in"
          : err instanceof Error
            ? err.message
            : "Failed to log in";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await authApi.register(input);
      setUser(data.user);
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
      } catch {
        // Non-fatal
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: { message?: string } } } })
              .response?.data?.error?.message || "Failed to register"
          : err instanceof Error
            ? err.message
            : "Failed to register";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      try {
        localStorage.removeItem(USER_STORAGE_KEY);
      } catch {
        // Non-fatal
      }
      setIsLoading(false);
    }
  }, []);

  const updateUser = useCallback((updatedUser: Partial<AuthUserDto>) => {
    setUser((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updatedUser };
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Non-fatal
      }
      return next;
    });
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    login,
    register,
    logout,
    updateUser,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
