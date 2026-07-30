"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { PermissionCodes } from "@/lib/permission-codes";
import { useAuthStore } from "@/stores/auth-store";

export type AdminGuardState = "checking" | "unauthenticated" | "forbidden" | "allowed";

/**
 * The first protected route this project has built (Sprint 5.1 shipped auth but no page that
 * actually required it) — client-side gating, not middleware, since the real access token lives
 * only in an in-memory module variable (`auth-client.ts`'s own doc comment on why: an XSS-
 * readable `localStorage` token would defeat the point). A server middleware has no way to see
 * that token; it only ever sees the HttpOnly refresh cookie, and validating that on every admin
 * request would mean an extra network round trip per navigation for no real benefit over
 * `AuthSessionRestorer`'s existing client-side restore-on-load.
 */
export function useRequireManageProducts(): AdminGuardState {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  let guardState: AdminGuardState;
  if (status === "idle" || status === "restoring") {
    guardState = "checking";
  } else if (status === "anonymous" || !user) {
    guardState = "unauthenticated";
  } else if (user.permissions.includes(PermissionCodes.ManageProducts)) {
    guardState = "allowed";
  } else {
    guardState = "forbidden";
  }

  useEffect(() => {
    if (guardState === "unauthenticated") router.replace("/login");
  }, [guardState, router]);

  return guardState;
}
