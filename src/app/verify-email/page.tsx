import type { Metadata } from "next";
import { Suspense } from "react";

import { VerifyEmailStatus } from "@/features/auth/components/VerifyEmailStatus";

export const metadata: Metadata = { title: "Verify email" };

export default function VerifyEmailPage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-24">
      <Suspense fallback={null}>
        <VerifyEmailStatus />
      </Suspense>
    </main>
  );
}
