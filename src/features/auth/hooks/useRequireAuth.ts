"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuthStore } from "@/stores/auth-store";

export type AuthGuardState = "checking" | "unauthenticated" | "allowed";

/**
 * Sprint 5.3 — the first customer-facing (non-admin) protected route this project has built
 * (`/orders`, `orders/me`'s only real caller). Same shape as
 * `features/admin/hooks/useRequireManageProducts.ts` minus the permission check — any
 * authenticated account, not a specific role — for the same reason that hook gives: client-side
 * gating, not middleware, since the real access token only ever lives in `auth-client.ts`'s
 * in-memory module variable, which a server middleware has no way to see.
 */
export function useRequireAuth(): AuthGuardState {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  let guardState: AuthGuardState;
  if (status === "idle" || status === "restoring") {
    guardState = "checking";
  } else if (status === "anonymous" || !user) {
    guardState = "unauthenticated";
  } else {
    guardState = "allowed";
  }

  useEffect(() => {
    if (guardState === "unauthenticated") router.replace("/login");
  }, [guardState, router]);

  return guardState;
}
