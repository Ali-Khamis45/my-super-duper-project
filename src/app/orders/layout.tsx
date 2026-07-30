"use client";

import { useRequireAuth } from "@/features/auth/hooks/useRequireAuth";

/** Sprint 5.3 — `/orders` and `/orders/[id]` both need a real account (`GET /orders/me`/`GET /orders/{id}` both `RequireAuthorization()`); same "checking" placeholder → redirect-on-unauthenticated shape as `app/admin/layout.tsx`, minus any permission requirement. */
export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  const guardState = useRequireAuth();

  if (guardState !== "allowed") {
    // "unauthenticated" redirects via the hook's own effect — this is the brief instant before
    // that navigation commits, not a dead end.
    return <div className="min-h-screen" aria-busy="true" aria-label="Checking access" />;
  }

  return <div id="main-content" className="mx-auto max-w-3xl px-4 pt-24 pb-16 sm:px-6">{children}</div>;
}
