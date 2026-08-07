"use client";

import { use } from "react";

import { AccessDenied } from "@/features/admin/components/AccessDenied";
import { useRequireViewInventory } from "@/features/admin/hooks/useRequireViewInventory";
import { InventoryItemDetail } from "@/features/admin/inventory/components/InventoryItemDetail";

export default function AdminInventoryItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const guardState = useRequireViewInventory();

  if (guardState === "checking" || guardState === "unauthenticated") {
    return <div aria-busy="true" aria-label="Checking access" />;
  }

  if (guardState === "forbidden") {
    return <AccessDenied />;
  }

  return <InventoryItemDetail inventoryItemId={id} />;
}
