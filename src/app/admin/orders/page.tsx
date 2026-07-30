"use client";

import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { AccessDenied } from "@/features/admin/components/AccessDenied";
import { AdminOrderFilters } from "@/features/admin/orders/components/AdminOrderFilters";
import { AdminOrderTable } from "@/features/admin/orders/components/AdminOrderTable";
import { useAdminOrdersQuery } from "@/features/admin/orders/hooks/useAdminOrdersQuery";
import { useRequireViewOrders } from "@/features/admin/hooks/useRequireViewOrders";
import type { AdminOrderFilter } from "@/lib/order-client";
import { Button } from "@/components/ui/button";

export default function AdminOrdersPage() {
  const guardState = useRequireViewOrders();
  const [filter, setFilter] = useState<AdminOrderFilter>({ page: 1, pageSize: 20, sortBy: "Newest" });
  const { data, isLoading, isError } = useAdminOrdersQuery(filter);

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
        <h1 className="font-display text-2xl">Orders</h1>
        <p className="text-muted-foreground text-sm">{data ? `${data.totalCount} total` : "Loading…"}</p>
      </div>

      <AdminOrderFilters filter={filter} onChange={setFilter} />

      {isError ? (
        <p className="text-destructive text-sm">Couldn&apos;t load orders. Try refreshing.</p>
      ) : isLoading && !data ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <AdminOrderTable orders={data?.items ?? []} isLoading={isLoading} />
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
