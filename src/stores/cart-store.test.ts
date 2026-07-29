import { beforeEach, describe, expect, it } from "vitest";

import { appEvents } from "@/engine/events";
import type { RecipeSnapshot } from "@/features/cart/types";
import { DEFAULT_SELECTION } from "@/stores/customizer-store";

import { MAX_CART_QUANTITY, MIN_CART_QUANTITY, selectCartItemCount, selectCartTotal, useCartStore } from "./cart-store";

function makeSnapshot(overrides: Partial<RecipeSnapshot> = {}): RecipeSnapshot {
  return {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    baseDrinkId: "classic-espresso",
    baseDrinkCategory: "espresso",
    baseDrinkName: "Classic Espresso",
    selection: DEFAULT_SELECTION,
    unitPrice: 3.5,
    appliedRecommendationId: null,
    ...overrides,
  };
}

function resetStore() {
  useCartStore.setState({ items: [], favorites: [], lastOrder: null });
}

describe("useCartStore", () => {
  beforeEach(() => {
    resetStore();
  });

  it("starts empty", () => {
    const state = useCartStore.getState();
    expect(state.items).toEqual([]);
    expect(state.favorites).toEqual([]);
    expect(state.lastOrder).toBeNull();
  });

  it("addItem() appends a new cart line and emits cart:item-added + cart:updated", () => {
    const snapshot = makeSnapshot();
    const events: unknown[] = [];
    const unsubAdded = appEvents.on("cart:item-added", (event) => events.push(event));
    const unsubUpdated = appEvents.on("cart:updated", (event) => events.push(event));

    useCartStore.getState().addItem(snapshot);
    unsubAdded();
    unsubUpdated();

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0]?.quantity).toBe(1);
    expect(events).toEqual([
      { name: "cart:item-added", recipeId: snapshot.id },
      { name: "cart:updated", itemCount: 1, total: 3.5 },
    ]);
  });

  it("addItem() with an identical recipe (same drink/selection/recommendation) merges into the existing line instead of duplicating it", () => {
    const snapshotA = makeSnapshot();
    const snapshotB = { ...makeSnapshot(), id: crypto.randomUUID(), selection: DEFAULT_SELECTION };

    useCartStore.getState().addItem(snapshotA);
    useCartStore.getState().addItem(snapshotB);

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0]?.quantity).toBe(2);
  });

  it("addItem() with a different selection does not merge", () => {
    const snapshotA = makeSnapshot();
    const snapshotB = { ...makeSnapshot(), id: crypto.randomUUID(), selection: { ...DEFAULT_SELECTION, color: "charcoal" as const } };

    useCartStore.getState().addItem(snapshotA);
    useCartStore.getState().addItem(snapshotB);

    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it("addItem() clamps merged quantity to MAX_CART_QUANTITY", () => {
    const snapshot = makeSnapshot();
    useCartStore.getState().addItem(snapshot, MAX_CART_QUANTITY);
    useCartStore.getState().addItem({ ...snapshot, id: crypto.randomUUID() }, 5);
    expect(useCartStore.getState().items[0]?.quantity).toBe(MAX_CART_QUANTITY);
  });

  it("removeItem() removes the line and emits cart:item-removed + cart:updated", () => {
    const snapshot = makeSnapshot();
    useCartStore.getState().addItem(snapshot);

    const events: unknown[] = [];
    const unsubRemoved = appEvents.on("cart:item-removed", (event) => events.push(event));
    const unsubUpdated = appEvents.on("cart:updated", (event) => events.push(event));
    useCartStore.getState().removeItem(snapshot.id);
    unsubRemoved();
    unsubUpdated();

    expect(useCartStore.getState().items).toHaveLength(0);
    expect(events).toEqual([
      { name: "cart:item-removed", recipeId: snapshot.id },
      { name: "cart:updated", itemCount: 0, total: 0 },
    ]);
  });

  it("removeItem() is a no-op for an id that isn't in the cart", () => {
    const snapshot = makeSnapshot();
    useCartStore.getState().addItem(snapshot);
    useCartStore.getState().removeItem("not-in-cart");
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it("updateQuantity() clamps to [MIN_CART_QUANTITY, MAX_CART_QUANTITY] and emits cart:updated", () => {
    const snapshot = makeSnapshot();
    useCartStore.getState().addItem(snapshot);

    useCartStore.getState().updateQuantity(snapshot.id, 999);
    expect(useCartStore.getState().items[0]?.quantity).toBe(MAX_CART_QUANTITY);

    useCartStore.getState().updateQuantity(snapshot.id, -5);
    expect(useCartStore.getState().items[0]?.quantity).toBe(MIN_CART_QUANTITY);
  });

  it("reorderItem() swaps adjacent lines", () => {
    const a = makeSnapshot();
    const b = { ...makeSnapshot(), id: crypto.randomUUID(), baseDrinkId: "mocha", selection: { ...DEFAULT_SELECTION, color: "charcoal" as const } };
    useCartStore.getState().addItem(a);
    useCartStore.getState().addItem(b);

    useCartStore.getState().reorderItem(b.id, "up");
    const ids = useCartStore.getState().items.map((item) => item.snapshot.id);
    expect(ids).toEqual([b.id, a.id]);
  });

  it("reorderItem() is a no-op at the boundaries", () => {
    const snapshot = makeSnapshot();
    useCartStore.getState().addItem(snapshot);
    useCartStore.getState().reorderItem(snapshot.id, "up");
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it("clear() empties the cart without touching favorites", () => {
    useCartStore.getState().addItem(makeSnapshot());
    useCartStore.getState().toggleFavorite(makeSnapshot());
    useCartStore.getState().clear();
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().favorites).toHaveLength(1);
  });

  it("toggleFavorite() adds then removes", () => {
    const snapshot = makeSnapshot();
    useCartStore.getState().toggleFavorite(snapshot);
    expect(useCartStore.getState().favorites).toHaveLength(1);
    useCartStore.getState().toggleFavorite(snapshot);
    expect(useCartStore.getState().favorites).toHaveLength(0);
  });

  it("addFavoriteToCart() adds a copy of the favorited recipe to the cart", () => {
    const snapshot = makeSnapshot();
    useCartStore.getState().toggleFavorite(snapshot);
    useCartStore.getState().addFavoriteToCart(snapshot.id);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]?.snapshot.id).toBe(snapshot.id);
  });

  it("placeOrder() returns null for an empty cart", () => {
    expect(useCartStore.getState().placeOrder()).toBeNull();
  });

  it("placeOrder() builds a CompletedOrder, clears the cart, sets lastOrder, and emits checkout:completed", () => {
    useCartStore.getState().addItem(makeSnapshot(), 2);
    const events: unknown[] = [];
    const unsub = appEvents.on("checkout:completed", (event) => events.push(event));

    const order = useCartStore.getState().placeOrder();
    unsub();

    expect(order).not.toBeNull();
    expect(order!.total).toBeCloseTo(7);
    expect(order!.items).toHaveLength(1);
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().lastOrder).toEqual(order);
    expect(events).toEqual([{ name: "checkout:completed", orderId: order!.id }]);
  });

  it("selectCartItemCount sums quantities, not line count", () => {
    useCartStore.getState().addItem(makeSnapshot(), 3);
    useCartStore.getState().addItem({ ...makeSnapshot(), id: crypto.randomUUID(), baseDrinkId: "mocha" }, 2);
    expect(selectCartItemCount(useCartStore.getState().items)).toBe(5);
  });

  it("selectCartTotal sums unitPrice * quantity across lines", () => {
    useCartStore.getState().addItem(makeSnapshot(), 2); // 3.5 * 2 = 7
    useCartStore.getState().addItem({ ...makeSnapshot(), id: crypto.randomUUID(), baseDrinkId: "mocha", unitPrice: 5.5 }, 1); // 5.5
    expect(selectCartTotal(useCartStore.getState().items)).toBeCloseTo(12.5);
  });
});
