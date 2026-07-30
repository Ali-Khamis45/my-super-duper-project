"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { PermissionCodes } from "@/lib/permission-codes";
import { useAuthStore } from "@/stores/auth-store";

import type { AdminGuardState } from "./useRequireAdminAccess";

/** Sprint 5.3 — same shape as `useRequireManageProducts`, gating specifically on `orders:view` for the `/admin/orders` pages themselves (defense-in-depth on top of the broader `useRequireAdminAccess` shell gate). */
export function useRequireViewOrders(): AdminGuardState {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  let guardState: AdminGuardState;
  if (status === "idle" || status === "restoring") {
    guardState = "checking";
  } else if (status === "anonymous" || !user) {
    guardState = "unauthenticated";
  } else if (user.permissions.includes(PermissionCodes.ViewOrders)) {
    guardState = "allowed";
  } else {
    guardState = "forbidden";
  }

  useEffect(() => {
    if (guardState === "unauthenticated") router.replace("/login");
  }, [guardState, router]);

  return guardState;
}
