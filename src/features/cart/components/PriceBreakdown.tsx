"use client";

import { useMemo } from "react";

import { selectCartTotal } from "@/stores/cart-store";
import type { CartItem } from "../types";

interface PriceBreakdownProps {
  items: CartItem[];
}

/**
 * "Price Breakdown" + "Memoize derived totals" (the brief's own
 * Performance requirement) — the per-line and running total are both
 * `useMemo`'d off `items`, so neither recomputes on an unrelated re-render
 * of whatever page hosts this (the cart page's own quantity-stepper
 * interactions, for instance).
 */
export function PriceBreakdown({ items }: PriceBreakdownProps) {
  const lines = useMemo(
    () => items.map((item) => ({ id: item.snapshot.id, label: item.snapshot.baseDrinkName, quantity: item.quantity, lineTotal: item.snapshot.unitPrice * item.quantity })),
    [items],
  );
  const total = useMemo(() => selectCartTotal(items), [items]);

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      {lines.map((line) => (
        <div key={line.id} className="text-muted-foreground flex items-center justify-between">
          <span>
            {line.label}
            {line.quantity > 1 ? ` ×${line.quantity}` : ""}
          </span>
          <span>${line.lineTotal.toFixed(2)}</span>
        </div>
      ))}
      <div className="border-border mt-1 flex items-center justify-between border-t pt-1.5 font-medium">
        <span>Total</span>
        <span className="font-display text-brand-accent-600 dark:text-brand-accent-400">${total.toFixed(2)}</span>
      </div>
    </div>
  );
}
