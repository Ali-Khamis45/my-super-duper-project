"use client";

import { Receipt } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

import { usePaymentReceiptQuery } from "../hooks/usePaymentReceiptQuery";

/**
 * `/payments/[id]` — the real receipt Sprint 5.5's brief names, composed live at read time from
 * `GetPaymentReceiptQuery` (real `Order`/`Payment` data, never a separately stored/generated
 * document — see that query's own doc comment). Reachable without an account: `GetPaymentQuery`/
 * `GetPaymentReceiptQuery` enforce ownership-or-staff-or-guest-order server-side, the exact same
 * pattern `GetOrderQuery` already established, so a guest who just paid can still open their own
 * receipt link without a login wall — see this page's own lack of an auth-gated layout.
 */
export function PaymentReceipt({ paymentId }: { paymentId: string }) {
  const { data: receipt, isLoading, isError } = usePaymentReceiptQuery(paymentId);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (isError || !receipt) {
    return (
      <div className="text-muted-foreground bg-muted/30 flex flex-col items-center gap-4 rounded-xl border border-dashed py-24 text-center">
        <Receipt className="size-14 opacity-30" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <h1 className="text-foreground font-display text-lg">Receipt not found</h1>
          <p className="text-sm">This payment either doesn&apos;t exist, isn&apos;t yours to view, or hasn&apos;t succeeded yet.</p>
        </div>
        <Button nativeButton={false} render={<Link href="/orders" />}>Back to my orders</Button>
      </div>
    );
  }

  const itemCount = receipt.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl">Receipt</h1>
        <p className="text-muted-foreground text-sm">
          Order #{receipt.orderNumber}
          {receipt.paidAtUtc ? ` — paid ${new Date(receipt.paidAtUtc).toLocaleString()}` : ""}
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-2">
          {receipt.items.map((item, index) => (
            <div key={`${item.productName}-${index}`} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {item.productName}
                {item.quantity > 1 ? ` ×${item.quantity}` : ""}
              </span>
              <span>${item.lineTotal.toFixed(2)}</span>
            </div>
          ))}
          <Separator className="my-1" />
          <div className="flex items-center justify-between font-medium">
            <span>
              Total ({itemCount} item{itemCount === 1 ? "" : "s"})
            </span>
            <span className="font-display text-brand-accent-600 dark:text-brand-accent-400">${receipt.amount.toFixed(2)}</span>
          </div>
          {receipt.methodDescription && (
            <p className="text-muted-foreground text-xs">
              Charged to {receipt.methodDescription} ({receipt.currency})
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-3">
        <Button nativeButton={false} render={<Link href="/orders" />}>View my orders</Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/menu" />}>Back to the menu</Button>
      </div>
    </div>
  );
}
