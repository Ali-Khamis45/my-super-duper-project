"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { PermissionCodes } from "@/lib/permission-codes";
import { useAuthStore } from "@/stores/auth-store";

import type { AdminGuardState } from "./useRequireAdminAccess";

/** Sprint 5.5 — same shape as `useRequireViewOrders`, gating specifically on `payments:view` for the `/admin/payments` pages themselves (defense-in-depth on top of the broader `useRequireAdminAccess` shell gate). */
export function useRequireViewPayments(): AdminGuardState {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  let guardState: AdminGuardState;
  if (status === "idle" || status === "restoring") {
    guardState = "checking";
  } else if (status === "anonymous" || !user) {
    guardState = "unauthenticated";
  } else if (user.permissions.includes(PermissionCodes.ViewPayments)) {
    guardState = "allowed";
  } else {
    guardState = "forbidden";
  }

  useEffect(() => {
    if (guardState === "unauthenticated") router.replace("/login");
  }, [guardState, router]);

  return guardState;
}
