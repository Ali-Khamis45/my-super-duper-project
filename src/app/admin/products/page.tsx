"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminProductFilter } from "@/lib/product-client";

import { ProductFilters } from "@/features/admin/products/components/ProductFilters";
import { ProductTable } from "@/features/admin/products/components/ProductTable";
import { useAdminProductsQuery } from "@/features/admin/products/hooks/useAdminProductsQuery";

export default function AdminProductsPage() {
  const [filter, setFilter] = useState<AdminProductFilter>({ page: 1, pageSize: 20 });
  const { data, isLoading, isError } = useAdminProductsQuery(filter);

  const page = filter.page ?? 1;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl">Products</h1>
          <p className="text-muted-foreground text-sm">{data ? `${data.totalCount} total` : "Loading…"}</p>
        </div>
        <Button render={<Link href="/admin/products/new" />}>New product</Button>
      </div>

      <ProductFilters filter={filter} onChange={setFilter} />

      {isError ? (
        <p className="text-destructive text-sm">Couldn&apos;t load products. Try refreshing.</p>
      ) : isLoading && !data ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <ProductTable products={data?.items ?? []} isLoading={isLoading} />
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
