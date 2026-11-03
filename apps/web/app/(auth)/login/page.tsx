import type { Metadata } from "next";
import { LoginForm } from "../../../features/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "Sign In — Connectly",
  description: "Sign in to your Connectly private messaging account",
};

export default function LoginPage() {
  return <LoginForm />;
}
