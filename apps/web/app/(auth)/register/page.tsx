import type { Metadata } from "next";
import { RegisterForm } from "../../../features/auth/components/RegisterForm";

export const metadata: Metadata = {
  title: "Create Account — Connectly",
  description: "Create your Connectly private messaging account",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
