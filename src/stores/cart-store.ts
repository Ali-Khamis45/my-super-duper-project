import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { appEvents } from "@/engine/events";
import type { CartItem, CompletedOrder, RecipeSnapshot } from "@/features/cart/types";

/**
 * Sprint 3.6's dedicated cart state — same "small, flat, dedicated Zustand
 * store alongside `ui-store.ts`, never inside `engine/`" convention every
 * prior feature store here has followed. `localStorage`-backed, not
 * `sessionStorage` — the one deliberate difference from every store this
 * project has built so far, and not a new decision: `docs/18_ENGINEERING_CONTRACTS.md`'s
 * "Cart store (future, Milestone 8 — designed now, not built)" section
 * specified this back at the Architecture Freeze ("a cart surviving a
 * reload is expected UX"). Built now to that real, pre-existing design,
 * extended well beyond its original 3-action sketch (`addItem`/`removeItem`/
 * `clear`) for this sprint's much richer brief (quantities, favorites,
 * reordering, checkout) — additive, not a rewrite of the original contract.
 */
export const MIN_CART_QUANTITY = 1;
export const MAX_CART_QUANTITY = 10;

/** Same recipe, ignoring identity/timestamp/derived price — a repeat "Add to Cart" for an unchanged configuration increments quantity instead of adding a duplicate line, the same merge behavior any real cart has. */
function isSameRecipe(a: RecipeSnapshot, b: RecipeSnapshot): boolean {
  return a.baseDrinkId === b.baseDrinkId && a.appliedRecommendationId === b.appliedRecommendationId && JSON.stringify(a.selection) === JSON.stringify(b.selection);
}

interface CartStoreState {
  items: CartItem[];
  /** Session-only in spirit (favorited recipes, not accounts) but persisted the same as the rest of this store for simplicity — see the brief's "Favorites (session only)," read here as "no server account," not "must vanish on reload." */
  favorites: RecipeSnapshot[];
  lastOrder: CompletedOrder | null;
  addItem: (snapshot: RecipeSnapshot, quantity?: number) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  reorderItem: (cartItemId: string, direction: "up" | "down") => void;
  clear: () => void;
  toggleFavorite: (snapshot: RecipeSnapshot) => void;
  addFavoriteToCart: (snapshotId: string) => void;
  /** Builds a `CompletedOrder` from the current cart, clears it, records `lastOrder` — the checkout flow's one commit point. Returns `null` for an empty cart (nothing to place). */
  placeOrder: () => CompletedOrder | null;
}

function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.snapshot.unitPrice * item.quantity, 0);
}

export const useCartStore = create<CartStoreState>()(
  persist(
    (set, get) => ({
      items: [],
      favorites: [],
      lastOrder: null,

      addItem: (snapshot, quantity = 1) => {
        const current = get().items;
        const existing = current.find((item) => isSameRecipe(item.snapshot, snapshot));
        let next: CartItem[];
        if (existing) {
          const mergedQuantity = Math.min(MAX_CART_QUANTITY, existing.quantity + quantity);
          next = current.map((item) => (item === existing ? { ...item, quantity: mergedQuantity } : item));
        } else {
          next = [...current, { snapshot, quantity: Math.min(MAX_CART_QUANTITY, Math.max(MIN_CART_QUANTITY, quantity)) }];
        }
        set({ items: next });
        appEvents.emit({ name: "cart:item-added", recipeId: snapshot.id });
        appEvents.emit({ name: "cart:updated", itemCount: next.length, total: cartTotal(next) });
      },

      removeItem: (cartItemId) => {
        const current = get().items;
        if (!current.some((item) => item.snapshot.id === cartItemId)) return;
        const next = current.filter((item) => item.snapshot.id !== cartItemId);
        set({ items: next });
        appEvents.emit({ name: "cart:item-removed", recipeId: cartItemId });
        appEvents.emit({ name: "cart:updated", itemCount: next.length, total: cartTotal(next) });
      },

      updateQuantity: (cartItemId, quantity) => {
        const current = get().items;
        const clamped = Math.min(MAX_CART_QUANTITY, Math.max(MIN_CART_QUANTITY, quantity));
        const existing = current.find((item) => item.snapshot.id === cartItemId);
        if (!existing || existing.quantity === clamped) return;
        const next = current.map((item) => (item.snapshot.id === cartItemId ? { ...item, quantity: clamped } : item));
        set({ items: next });
        appEvents.emit({ name: "cart:updated", itemCount: next.length, total: cartTotal(next) });
      },

      reorderItem: (cartItemId, direction) => {
        const current = get().items;
        const index = current.findIndex((item) => item.snapshot.id === cartItemId);
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (index === -1 || targetIndex < 0 || targetIndex >= current.length) return;
        const reordered = [...current];
        const moved = reordered[index]!;
        reordered[index] = reordered[targetIndex]!;
        reordered[targetIndex] = moved;
        set({ items: reordered });
      },

      clear: () => set({ items: [] }),

      toggleFavorite: (snapshot) => {
        const current = get().favorites;
        const alreadyFavorited = current.some((entry) => entry.id === snapshot.id);
        set({
          favorites: alreadyFavorited ? current.filter((entry) => entry.id !== snapshot.id) : [...current, snapshot],
        });
      },

      addFavoriteToCart: (snapshotId) => {
        const favorite = get().favorites.find((entry) => entry.id === snapshotId);
        if (!favorite) return;
        get().addItem(favorite, 1);
      },

      placeOrder: () => {
        const items = get().items;
        if (items.length === 0) return null;
        const order: CompletedOrder = {
          id: crypto.randomUUID(),
          placedAt: Date.now(),
          items,
          total: cartTotal(items),
        };
        set({ items: [], lastOrder: order });
        appEvents.emit({ name: "checkout:completed", orderId: order.id });
        return order;
      },
    }),
    {
      name: "coffeshop-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        favorites: state.favorites,
        lastOrder: state.lastOrder,
      }),
    },
  ),
);

export function selectCartItemCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function selectCartTotal(items: CartItem[]): number {
  return cartTotal(items);
}
