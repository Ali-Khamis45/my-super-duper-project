import type { Metadata } from "next";

import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-24">
      <LoginForm />
    </main>
  );
}
