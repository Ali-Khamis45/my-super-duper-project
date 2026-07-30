import type { LucideIcon } from "lucide-react";

/**
 * No backend/CMS exists in this project (ADR-0005: TanStack Query is
 * reserved for a *real* future endpoint, "no placeholder queries"). This
 * catalog is static, typed, first-party data — same category as the hero
 * cup's procedural geometry standing in for a future real asset, not a
 * shortcut taken lightly.
 */
export type DrinkCategoryId = "espresso" | "cold-brew" | "seasonal" | "tea";

export interface DrinkCategory {
  id: DrinkCategoryId;
  label: string;
  icon: LucideIcon;
}

export interface Drink {
  id: string;
  name: string;
  category: DrinkCategoryId;
  price: number;
  /** One evocative line, not a marketing paragraph — docs/strategy/product-vision.md's "sensory craft over information density." */
  tagline: string;
  /** A little more detail, shown only in the detail dialog. */
  description: string;
  tags: string[];
  /**
   * The real backend `Product.Id` (Sprint 5.2) — present for drinks sourced from the live
   * Catalog API (`mapProductToDrink.ts`), `undefined` for `data/drinks.ts`'s static entries.
   * Optional, not required, so that file — still real, still used as-is by existing tests and by
   * every lookup that only needs an already-known `id` — never had to be retrofitted with a Guid
   * it has no way to know.
   */
  productId?: string;
}
