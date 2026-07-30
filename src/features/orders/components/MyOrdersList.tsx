"use client";

import { PackageOpen } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useMyOrdersQuery } from "../hooks/useMyOrdersQuery";
import { OrderStatusBadge } from "./OrderStatusBadge";

/** `/orders` — "My Orders," the real order history `GetMyOrdersQuery` returns (Sprint 5.3's replacement for `cart-store.ts`'s old, purely local `lastOrder`-only history). Guest orders never appear here — there's no account for them to belong to (see `GetMyOrdersQuery`'s own doc comment). */
export function MyOrdersList() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useMyOrdersQuery(page);

  if (isError) {
    return <p className="text-destructive py-12 text-center text-sm">Couldn&apos;t load your orders. Try refreshing.</p>;
  }

  if (isLoading && !data) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  const orders = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  if (orders.length === 0) {
    return (
      <div className="text-muted-foreground bg-muted/30 flex flex-col items-center gap-4 rounded-xl border border-dashed py-24 text-center">
        <PackageOpen className="size-14 opacity-30" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <h2 className="text-foreground font-display text-lg">No orders yet</h2>
          <p className="text-sm">Once you place an order, it&apos;ll show up here.</p>
        </div>
        <Button nativeButton={false} render={<Link href="/menu" />}>Browse the menu</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        {orders.map((order) => (
          <Link key={order.id} href={`/orders/${order.id}`}>
            <Card className="hover:border-brand-accent-500/50 transition-colors">
              <CardContent className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{order.orderNumber}</span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(order.createdAtUtc).toLocaleDateString()} · {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-brand-accent-600 dark:text-brand-accent-400">${order.total.toFixed(2)}</span>
                  <OrderStatusBadge status={order.status} />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
            Previous
          </Button>
          <span className="text-muted-foreground text-sm">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
