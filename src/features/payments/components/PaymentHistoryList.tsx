"use client";

import { Receipt } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useMyPaymentsQuery } from "../hooks/useMyPaymentsQuery";
import { PaymentStatusBadge } from "./PaymentStatusBadge";

/** `/payments` — the customer's own payment history, mirroring `MyOrdersList`'s own shape (`ListPaymentsQuery`, `CustomerId` always read from the JWT server-side, never the request). */
export function PaymentHistoryList() {
  const { data, isLoading, isError } = useMyPaymentsQuery();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="text-destructive text-sm">Couldn&apos;t load your payment history. Try refreshing.</p>;
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="text-muted-foreground bg-muted/30 flex flex-col items-center gap-4 rounded-xl border border-dashed py-24 text-center">
        <Receipt className="size-14 opacity-30" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <h1 className="text-foreground font-display text-lg">No payments yet</h1>
          <p className="text-sm">A real order and payment will show up here.</p>
        </div>
        <Button nativeButton={false} render={<Link href="/menu" />}>Browse the menu</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {data.items.map((payment) => (
        <Card key={payment.id}>
          <CardContent className="flex items-center justify-between gap-4 py-4">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">{payment.orderNumber ?? "Order"}</span>
              <span className="text-muted-foreground text-xs">{new Date(payment.createdAtUtc).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-display">${payment.amount.toFixed(2)}</span>
              <PaymentStatusBadge status={payment.status} />
              {payment.status === "succeeded" && (
                <Button size="sm" variant="ghost" render={<Link href={`/payments/${payment.id}`} />}>
                  Receipt
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
