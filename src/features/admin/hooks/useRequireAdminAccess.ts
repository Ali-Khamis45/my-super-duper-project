"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { PermissionCodes } from "@/lib/permission-codes";
import { useAuthStore } from "@/stores/auth-store";

export type AdminGuardState = "checking" | "unauthenticated" | "forbidden" | "allowed";

/**
 * Sprint 5.3 — the `/admin` shell's own gate, broadened from `useRequireManageProducts`'s single
 * hardcoded permission (left untouched — Catalog admin's own page-level checks still use it
 * directly) to "any real admin-area permission at all." Ordering's `PermissionCodes.ViewOrders`/
 * `UpdateOrderStatus` are seeded to `Staff` (`IdentitySeeder.cs`), a role that does *not* get
 * `ManageProducts` — without this, a Staff account could never even reach `/admin/orders`, since
 * `app/admin/layout.tsx` wraps every `/admin/*` route with one shared gate. Individual admin
 * pages still enforce their own specific requirement on top of this (`/admin/orders` via
 * `useRequireViewOrders`, Catalog's pages via `useRequireManageProducts`) — this hook only
 * decides "does this account belong in the admin shell at all," not "can it do this one thing."
 */
export function useRequireAdminAccess(): AdminGuardState {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  let guardState: AdminGuardState;
  if (status === "idle" || status === "restoring") {
    guardState = "checking";
  } else if (status === "anonymous" || !user) {
    guardState = "unauthenticated";
  } else if (
    user.permissions.includes(PermissionCodes.ManageProducts) ||
    user.permissions.includes(PermissionCodes.ViewOrders) ||
    user.permissions.includes(PermissionCodes.UpdateOrderStatus) ||
    user.permissions.includes(PermissionCodes.ViewInventory) ||
    user.permissions.includes(PermissionCodes.AdjustInventory)
  ) {
    guardState = "allowed";
  } else {
    guardState = "forbidden";
  }

  useEffect(() => {
    if (guardState === "unauthenticated") router.replace("/login");
  }, [guardState, router]);

  return guardState;
}
