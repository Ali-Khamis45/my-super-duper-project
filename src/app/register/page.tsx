import type { Metadata } from "next";

import { RegisterForm } from "@/features/auth/components/RegisterForm";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-24">
      <RegisterForm />
    </main>
  );
}
