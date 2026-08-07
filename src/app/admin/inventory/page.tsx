"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AccessDenied } from "@/features/admin/components/AccessDenied";
import { useRequireViewInventory } from "@/features/admin/hooks/useRequireViewInventory";
import { InventoryDashboardSummary } from "@/features/admin/inventory/components/InventoryDashboardSummary";
import { InventoryFilters } from "@/features/admin/inventory/components/InventoryFilters";
import { InventoryTable } from "@/features/admin/inventory/components/InventoryTable";
import { useAdminInventoryQuery } from "@/features/admin/inventory/hooks/useAdminInventoryQuery";
import type { AdminInventoryFilter } from "@/lib/inventory-client";

export default function AdminInventoryPage() {
  const guardState = useRequireViewInventory();
  const [filter, setFilter] = useState<AdminInventoryFilter>({ page: 1, pageSize: 20, sortBy: "NameAsc" });
  const { data, isLoading, isError } = useAdminInventoryQuery(filter);

  if (guardState === "checking" || guardState === "unauthenticated") {
    return <div aria-busy="true" aria-label="Checking access" />;
  }

  if (guardState === "forbidden") {
    return <AccessDenied />;
  }

  const page = filter.page ?? 1;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Inventory</h1>
          <p className="text-muted-foreground text-sm">{data ? `${data.totalCount} tracked ingredient(s)` : "Loading…"}</p>
        </div>
        <Button variant="outline" size="sm" render={<Link href="/admin/inventory/reservations" />}>
          Reservations
        </Button>
      </div>

      <InventoryDashboardSummary />

      <InventoryFilters filter={filter} onChange={setFilter} />

      {isError ? (
        <p className="text-destructive text-sm">Couldn&apos;t load inventory. Try refreshing.</p>
      ) : isLoading && !data ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <InventoryTable items={data?.items ?? []} isLoading={isLoading} />
      )}

      {data && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setFilter({ ...filter, page: page - 1 })}>
            Previous
          </Button>
          <span className="text-muted-foreground text-sm">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setFilter({ ...filter, page: page + 1 })}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
