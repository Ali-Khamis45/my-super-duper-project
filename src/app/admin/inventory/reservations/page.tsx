"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AccessDenied } from "@/features/admin/components/AccessDenied";
import { useRequireViewInventory } from "@/features/admin/hooks/useRequireViewInventory";
import { InventoryReservationsFilters } from "@/features/admin/inventory/components/InventoryReservationsFilters";
import { InventoryReservationsTable } from "@/features/admin/inventory/components/InventoryReservationsTable";
import { useInventoryReservationsQuery } from "@/features/admin/inventory/hooks/useInventoryReservationsQuery";
import type { InventoryReservationsFilter } from "@/lib/inventory-client";

export default function AdminInventoryReservationsPage() {
  const guardState = useRequireViewInventory();
  const [filter, setFilter] = useState<InventoryReservationsFilter>({ page: 1, pageSize: 20 });
  const { data, isLoading, isError } = useInventoryReservationsQuery(filter);

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
      <div>
        <h1 className="font-display text-2xl">Inventory reservations</h1>
        <p className="text-muted-foreground text-sm">{data ? `${data.totalCount} total` : "Loading…"}</p>
      </div>

      <InventoryReservationsFilters filter={filter} onChange={setFilter} />

      {isError ? (
        <p className="text-destructive text-sm">Couldn&apos;t load reservations. Try refreshing.</p>
      ) : isLoading && !data ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <InventoryReservationsTable reservations={data?.items ?? []} isLoading={isLoading} />
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
