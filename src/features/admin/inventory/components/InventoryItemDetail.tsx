"use client";

import { PackageSearch } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-errors";

import { useAdminInventoryItemQuery } from "../hooks/useAdminInventoryItemQuery";
import { useInventoryHistoryQuery } from "../hooks/useInventoryHistoryQuery";
import { useInventoryMutations } from "../hooks/useInventoryMutations";
import { InventoryStatusBadge } from "./InventoryStatusBadge";

const REASON_LABEL: Record<string, string> = {
  "order-consumption": "Order consumption",
  restock: "Restock",
  "manual-adjustment": "Manual adjustment",
};

/**
 * `/admin/inventory/[id]` — staff/admin's real stock actions, mirroring
 * `Coffeshop.Domain.Inventory.InventoryItem`'s real behavior methods (`Restock`/`Adjust`/
 * `MarkOutOfStock`/`MarkAvailable`) one-to-one. No client-side "can I do this" guard the way
 * `AdminOrderDetail` has (`canPay`/`canComplete`/etc.) — every one of these actions is always
 * legal from any real `InventoryStatus` (restocking an available item, or adjusting an
 * out-of-stock one back up, are both real, everyday staff actions), so all five stay visible at
 * all times; the server-side domain guards (e.g. `Adjust`'s own zero-delta/blank-reason checks)
 * are the real validation, surfaced inline on failure the same way `AdminOrderDetail` does.
 */
export function InventoryItemDetail({ inventoryItemId }: { inventoryItemId: string }) {
  const { data: item, isLoading, isError } = useAdminInventoryItemQuery(inventoryItemId);
  const { data: history } = useInventoryHistoryQuery({ inventoryItemId, page: 1, pageSize: 10 });
  const mutations = useInventoryMutations();

  const [error, setError] = useState<string | null>(null);
  const [restockQuantity, setRestockQuantity] = useState("");
  const [restockNote, setRestockNote] = useState("");
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [threshold, setThreshold] = useState("");

  async function runAction(action: Promise<unknown>) {
    setError(null);
    try {
      await action;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That action couldn't be completed. Try again.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !item) {
    return (
      <div className="text-muted-foreground bg-muted/30 flex flex-col items-center gap-4 rounded-xl border border-dashed py-24 text-center">
        <PackageSearch className="size-14 opacity-30" aria-hidden="true" />
        <h1 className="text-foreground font-display text-lg">Inventory item not found</h1>
        <Button nativeButton={false} render={<Link href="/admin/inventory" />}>
          Back to inventory
        </Button>
      </div>
    );
  }

  const anyPending =
    mutations.restock.isPending ||
    mutations.adjust.isPending ||
    mutations.markOutOfStock.isPending ||
    mutations.markAvailable.isPending ||
    mutations.updateLowStockPolicy.isPending;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl">{item.ingredientName}</h1>
          <p className="text-muted-foreground text-sm">Code: {item.ingredientCode}</p>
        </div>
        <InventoryStatusBadge status={item.status} />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">On hand</span>
            <span>{item.stockLevel}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Reserved</span>
            <span>{item.reservedQuantity}</span>
          </div>
          <Separator className="my-1" />
          <div className="flex items-center justify-between font-medium">
            <span>Available</span>
            <span className="font-display text-brand-accent-600 dark:text-brand-accent-400">{item.availableQuantity}</span>
          </div>
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-3 py-4">
            <h2 className="font-display text-sm font-semibold">Restock</h2>
            <div className="flex flex-col gap-1">
              <Label htmlFor="restock-quantity">Quantity</Label>
              <Input id="restock-quantity" type="number" min={1} value={restockQuantity} onChange={(event) => setRestockQuantity(event.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="restock-note">Note (optional)</Label>
              <Input id="restock-note" value={restockNote} onChange={(event) => setRestockNote(event.target.value)} placeholder="e.g. Weekly delivery" />
            </div>
            <Button
              size="sm"
              disabled={anyPending || !restockQuantity || Number(restockQuantity) <= 0}
              onClick={() => {
                void runAction(mutations.restock.mutateAsync({ id: item.id, quantity: Number(restockQuantity), note: restockNote.trim() || null }));
                setRestockQuantity("");
                setRestockNote("");
              }}
            >
              Restock
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3 py-4">
            <h2 className="font-display text-sm font-semibold">Adjust</h2>
            <div className="flex flex-col gap-1">
              <Label htmlFor="adjust-delta">Delta (negative shrinks stock)</Label>
              <Input id="adjust-delta" type="number" value={adjustDelta} onChange={(event) => setAdjustDelta(event.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="adjust-reason">Reason</Label>
              <Input id="adjust-reason" value={adjustReason} onChange={(event) => setAdjustReason(event.target.value)} placeholder="e.g. Spoilage" />
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={anyPending || !adjustDelta || Number(adjustDelta) === 0 || !adjustReason.trim()}
              onClick={() => {
                void runAction(mutations.adjust.mutateAsync({ id: item.id, delta: Number(adjustDelta), reason: adjustReason.trim() }));
                setAdjustDelta("");
                setAdjustReason("");
              }}
            >
              Apply adjustment
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3 py-4">
            <h2 className="font-display text-sm font-semibold">Availability override</h2>
            <p className="text-muted-foreground text-xs">
              Forces the status shown above regardless of the real balance — the next restock/adjustment re-derives it automatically. See{" "}
              <code>InventoryItem.MarkOutOfStock</code>&apos;s own doc comment.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={anyPending || item.status === "out-of-stock"} onClick={() => runAction(mutations.markOutOfStock.mutateAsync(item.id))}>
                Mark out of stock
              </Button>
              <Button size="sm" variant="outline" disabled={anyPending} onClick={() => runAction(mutations.markAvailable.mutateAsync(item.id))}>
                Re-derive status
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3 py-4">
            <h2 className="font-display text-sm font-semibold">Low-stock threshold</h2>
            <p className="text-muted-foreground text-xs">Currently {item.lowStockThreshold}.</p>
            <div className="flex items-end gap-2">
              <div className="flex flex-1 flex-col gap-1">
                <Label htmlFor="threshold">New threshold</Label>
                <Input id="threshold" type="number" min={0} value={threshold} onChange={(event) => setThreshold(event.target.value)} />
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={anyPending || threshold === "" || Number(threshold) < 0}
                onClick={() => {
                  void runAction(mutations.updateLowStockPolicy.mutateAsync({ id: item.id, threshold: Number(threshold) }));
                  setThreshold("");
                }}
              >
                Update
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="font-display mb-3 text-lg">Recent activity</h2>
        {history && history.items.length > 0 ? (
          <div className="flex flex-col gap-2">
            {history.items.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between border-b pb-2 text-sm last:border-0">
                <span className="text-muted-foreground">
                  {REASON_LABEL[transaction.reason] ?? transaction.reason} · {new Date(transaction.occurredAtUtc).toLocaleString()}
                </span>
                <span className={transaction.quantityDelta < 0 ? "text-destructive" : "text-foreground"}>
                  {transaction.quantityDelta > 0 ? "+" : ""}
                  {transaction.quantityDelta} → {transaction.balanceAfter}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No activity recorded yet.</p>
        )}
      </div>
    </div>
  );
}
