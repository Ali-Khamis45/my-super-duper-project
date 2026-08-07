"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInventoryDashboardQuery } from "../hooks/useInventoryDashboardQuery";

/** The "Inventory dashboard. Low-stock indicators." piece of this sprint's own Phase 6 brief — real counts from `GetInventoryDashboardQuery`'s single grouped query, not a client-side count of the (paged, possibly-filtered) table below it. */
export function InventoryDashboardSummary() {
  const { data, isLoading, isError } = useInventoryDashboardQuery();

  if (isError) {
    return null; // Non-critical summary strip — a failure here shouldn't block the list below it.
  }

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  const cards = [
    { label: "Total items", value: data.totalItems },
    { label: "Available", value: data.availableCount },
    { label: "Low stock", value: data.lowStockCount, highlight: data.lowStockCount > 0 },
    { label: "Out of stock", value: data.outOfStockCount, highlight: data.outOfStockCount > 0 },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="flex flex-col gap-1 py-4">
            <span className="text-muted-foreground text-xs">{card.label}</span>
            <span className={`font-display text-2xl ${card.highlight ? "text-destructive" : ""}`}>{card.value}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
