import { beforeEach, describe, expect, it } from "vitest";

import type { Drink } from "@/features/menu/types";

import { useMenuStore } from "./menu-store";

const sampleDrink: Drink = {
  id: "classic-espresso",
  productId: "11111111-1111-1111-1111-111111111111",
  name: "Classic Espresso",
  category: "espresso",
  price: 3.5,
  tagline: "A tagline.",
  description: "A description.",
  tags: ["strong"],
};

function resetStore() {
  useMenuStore.setState({ drinks: [], isLoaded: false });
}

describe("useMenuStore", () => {
  beforeEach(() => {
    resetStore();
  });

  it("starts empty and not loaded", () => {
    const state = useMenuStore.getState();
    expect(state.drinks).toEqual([]);
    expect(state.isLoaded).toBe(false);
  });

  it("setDrinks replaces the list and marks the store loaded", () => {
    useMenuStore.getState().setDrinks([sampleDrink]);

    const state = useMenuStore.getState();
    expect(state.drinks).toEqual([sampleDrink]);
    expect(state.isLoaded).toBe(true);
  });

  it("setDrinks with an empty array still marks the store loaded — a real empty catalog is a valid loaded state, not a reason to look uninitialized", () => {
    useMenuStore.getState().setDrinks([sampleDrink]);
    useMenuStore.getState().setDrinks([]);

    const state = useMenuStore.getState();
    expect(state.drinks).toEqual([]);
    expect(state.isLoaded).toBe(true);
  });
});
