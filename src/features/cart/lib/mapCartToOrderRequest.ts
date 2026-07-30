import type { CreateOrderLineInput } from "@/lib/order-client";

import type { CartItem } from "../types";

/**
 * Sprint 5.3 — the one place a cart's `CartItem[]` (a `RecipeSnapshot` + `quantity`) becomes the
 * request body `POST /api/v1/orders` actually accepts. Deliberately doesn't send `unitPrice`/
 * `total` at all — `CreateOrderLineInput` has no such field, since the backend always
 * recalculates from the catalog's own `Product.Price`/`Ingredient.PriceModifier`
 * (`CreateOrderFromCartCommandHandler`'s own "never trust client pricing" rule) rather than
 * accepting whatever the frontend displayed.
 */
export function mapCartItemsToOrderLines(items: CartItem[]): CreateOrderLineInput[] {
  return items.map((item) => ({
    productId: item.snapshot.productId,
    selection: item.snapshot.selection,
    quantity: item.quantity,
    recommendationId: item.snapshot.appliedRecommendationId,
  }));
}
