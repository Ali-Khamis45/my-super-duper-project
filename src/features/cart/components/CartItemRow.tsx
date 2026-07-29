"use client";

import { Heart, Minus, Pencil, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { resolveCupSize } from "@/features/customizer/data/sizes";
import { cn } from "@/lib/utils";
import { MAX_CART_QUANTITY, MIN_CART_QUANTITY, useCartStore } from "@/stores/cart-store";
import { useCustomizerStore } from "@/stores/customizer-store";

import type { CartItem } from "../types";

interface CartItemRowProps {
  item: CartItem;
  /** Mini-cart rows skip quantity/remove controls in favor of a compact read-only summary; the full cart page wants everything. */
  compact?: boolean;
}

/**
 * One cart line, shared by `MiniCart` and the full `/cart` page — "reuse
 * existing... models," rendering the same `RecipeSnapshot` shape either
 * way rather than two different item components drifting apart.
 */
export function CartItemRow({ item, compact = false }: CartItemRowProps) {
  const router = useRouter();
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const favorites = useCartStore((state) => state.favorites);
  const toggleFavorite = useCartStore((state) => state.toggleFavorite);
  const isFavorited = favorites.some((entry) => entry.id === item.snapshot.id);
  const size = resolveCupSize(item.snapshot.selection.size);
  const ingredientCount = item.snapshot.selection.ingredients.length;

  function handleEdit() {
    // "Editing items in the cart" — rehydrate the customizer from this
    // exact snapshot (no reconstruction) and go there.
    useCustomizerStore.getState().loadRecipeSnapshot(item.snapshot.baseDrinkId, item.snapshot.baseDrinkCategory, item.snapshot.selection, item.snapshot.appliedRecommendationId);
    router.push(`/customize?drink=${item.snapshot.baseDrinkId}`);
  }

  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-sm font-medium">{item.snapshot.baseDrinkName}</p>
        <p className="text-muted-foreground text-xs">
          {size.label}
          {ingredientCount > 0 ? ` · ${ingredientCount} ingredient${ingredientCount === 1 ? "" : "s"}` : ""}
          {item.snapshot.appliedRecommendationId ? " · AI recommended" : ""}
        </p>
        <p className="text-muted-foreground text-xs">${item.snapshot.unitPrice.toFixed(2)} each</p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon-sm" aria-label={isFavorited ? `Remove ${item.snapshot.baseDrinkName} from favorites` : `Save ${item.snapshot.baseDrinkName} to favorites`} aria-pressed={isFavorited} onClick={() => toggleFavorite(item.snapshot)}>
            <Heart className={cn("size-3.5", isFavorited && "fill-brand-accent-500 text-brand-accent-500")} aria-hidden="true" />
          </Button>
          {!compact && (
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${item.snapshot.baseDrinkName}`} onClick={handleEdit}>
              <Pencil className="size-3.5" aria-hidden="true" />
            </Button>
          )}
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${item.snapshot.baseDrinkName} from cart`} onClick={() => removeItem(item.snapshot.id)}>
            <X className="size-3.5" aria-hidden="true" />
          </Button>
        </div>

        {compact ? (
          <span className="text-muted-foreground text-xs">Qty {item.quantity}</span>
        ) : (
          <div className="flex items-center gap-0.5" role="group" aria-label={`${item.snapshot.baseDrinkName} quantity`}>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Decrease ${item.snapshot.baseDrinkName} quantity`}
              disabled={item.quantity <= MIN_CART_QUANTITY}
              onClick={() => updateQuantity(item.snapshot.id, item.quantity - 1)}
            >
              <Minus className="size-3" aria-hidden="true" />
            </Button>
            <span className="w-5 text-center text-sm tabular-nums" aria-hidden="true">
              {item.quantity}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Increase ${item.snapshot.baseDrinkName} quantity`}
              disabled={item.quantity >= MAX_CART_QUANTITY}
              onClick={() => updateQuantity(item.snapshot.id, item.quantity + 1)}
            >
              <Plus className="size-3" aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
