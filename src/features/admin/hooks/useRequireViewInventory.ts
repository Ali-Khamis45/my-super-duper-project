"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { PermissionCodes } from "@/lib/permission-codes";
import { useAuthStore } from "@/stores/auth-store";

import type { AdminGuardState } from "./useRequireAdminAccess";

/** Sprint 5.4 — same shape as `useRequireViewOrders`, gating specifically on `inventory:view` for the `/admin/inventory` pages themselves (defense-in-depth on top of the broader `useRequireAdminAccess` shell gate). `AdjustInventory`-gated actions (restock/adjust/mark/expire) aren't behind a second client-side guard — same laxness `AdminOrderDetail`'s status-mutation buttons already established: rendered once `ViewInventory`-gated, and the server 403s a `Staff` account that lacks `AdjustInventory` (nobody currently has `ViewInventory` without `AdjustInventory` per `IdentitySeeder`, but the server is the real enforcement point either way). */
export function useRequireViewInventory(): AdminGuardState {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  let guardState: AdminGuardState;
  if (status === "idle" || status === "restoring") {
    guardState = "checking";
  } else if (status === "anonymous" || !user) {
    guardState = "unauthenticated";
  } else if (user.permissions.includes(PermissionCodes.ViewInventory)) {
    guardState = "allowed";
  } else {
    guardState = "forbidden";
  }

  useEffect(() => {
    if (guardState === "unauthenticated") router.replace("/login");
  }, [guardState, router]);

  return guardState;
}
