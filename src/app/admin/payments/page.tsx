"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AccessDenied } from "@/features/admin/components/AccessDenied";
import { useRequireViewPayments } from "@/features/admin/hooks/useRequireViewPayments";
import { AdminPaymentFilters } from "@/features/admin/payments/components/AdminPaymentFilters";
import { AdminPaymentTable } from "@/features/admin/payments/components/AdminPaymentTable";
import { useAdminPaymentsQuery } from "@/features/admin/payments/hooks/useAdminPaymentsQuery";
import type { AdminPaymentFilter } from "@/lib/payment-client";

export default function AdminPaymentsPage() {
  const guardState = useRequireViewPayments();
  const [filter, setFilter] = useState<AdminPaymentFilter>({ page: 1, pageSize: 20 });
  const { data, isLoading, isError } = useAdminPaymentsQuery(filter);

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
        <h1 className="font-display text-2xl">Payments</h1>
        <p className="text-muted-foreground text-sm">{data ? `${data.totalCount} total` : "Loading…"}</p>
      </div>

      <AdminPaymentFilters filter={filter} onChange={setFilter} />

      {isError ? (
        <p className="text-destructive text-sm">Couldn&apos;t load payments. Try refreshing.</p>
      ) : isLoading && !data ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <AdminPaymentTable payments={data?.items ?? []} isLoading={isLoading} />
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
