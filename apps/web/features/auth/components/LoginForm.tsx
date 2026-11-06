"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@repo/contracts/auth";
import { useAuthSession } from "../hooks/useAuthSession";

export function LoginForm() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuthSession();
  const [formError, setFormError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setFormError(null);
    try {
      await login(data);
      router.replace("/");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: { message?: string } } } })
              .response?.data?.error?.message || "Invalid credentials. Please try again."
          : err instanceof Error
            ? err.message
            : "Invalid credentials. Please try again.";
      setFormError(message);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-card text-card-foreground rounded-2xl shadow-lg border border-border">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Welcome to Connectly</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sign in to your private chat account
        </p>
      </div>

      {formError && (
        <div
          role="alert"
          className="mb-4 p-3 rounded-lg bg-destructive/15 text-destructive text-sm font-medium border border-destructive/20"
        >
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label
            htmlFor="identifier"
            className="block text-sm font-medium mb-1.5"
          >
            Email or Username
          </label>
          <input
            id="identifier"
            type="text"
            autoComplete="username"
            disabled={isSubmitting}
            placeholder="alice@connectly.dev or alice"
            className="w-full px-3.5 py-2.5 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 transition"
            {...register("identifier")}
          />
          {errors.identifier && (
            <p className="text-xs text-destructive mt-1 font-medium">
              {errors.identifier.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium mb-1.5"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            disabled={isSubmitting}
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 transition"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive mt-1 font-medium">
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-semibold rounded-lg shadow hover:opacity-90 active:scale-[0.99] transition disabled:opacity-50 mt-2 flex items-center justify-center"
        >
          {isSubmitting ? (
            <span className="inline-block animate-spin mr-2 border-2 border-primary-foreground border-t-transparent rounded-full w-4 h-4" />
          ) : null}
          {isSubmitting ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-semibold text-primary hover:underline"
        >
          Create one now
        </Link>
      </div>
    </div>
  );
}
