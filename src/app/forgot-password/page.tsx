import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-24">
      <ForgotPasswordForm />
    </main>
  );
}
