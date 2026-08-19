"use client";

import { useRequireAuth } from "@/features/auth/hooks/useRequireAuth";

/**
 * Wraps only the `(history)` route group — `/payments` itself needs a real account
 * (`GET /payments/history` is `RequireAuthorization()`), same shape as `app/orders/layout.tsx`.
 * A route group, not a plain nested folder, specifically so this guard does **not** also apply
 * to the sibling `/payments/[id]` receipt route — that one is deliberately public (see its own
 * layout's doc comment), and Next.js layouts otherwise cascade to every nested segment.
 */
export default function PaymentsHistoryLayout({ children }: { children: React.ReactNode }) {
  const guardState = useRequireAuth();

  if (guardState !== "allowed") {
    return <div className="min-h-screen" aria-busy="true" aria-label="Checking access" />;
  }

  return (
    <div id="main-content" className="mx-auto max-w-3xl px-4 pt-24 pb-16 sm:px-6">
      {children}
    </div>
  );
}
