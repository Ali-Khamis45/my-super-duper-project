import { Coffee } from "lucide-react";
import { beforeEach, describe, expect, it } from "vitest";

import type { DrinkCategory } from "@/features/menu/types";

import { useCategoryStore } from "./category-store";

const sampleCategory: DrinkCategory = { id: "espresso", label: "Espresso", icon: Coffee };

function resetStore() {
  useCategoryStore.setState({ categories: [], isLoaded: false });
}

describe("useCategoryStore", () => {
  beforeEach(() => {
    resetStore();
  });

  it("starts empty and not loaded", () => {
    const state = useCategoryStore.getState();
    expect(state.categories).toEqual([]);
    expect(state.isLoaded).toBe(false);
  });

  it("setCategories replaces the list and marks the store loaded", () => {
    useCategoryStore.getState().setCategories([sampleCategory]);

    const state = useCategoryStore.getState();
    expect(state.categories).toEqual([sampleCategory]);
    expect(state.isLoaded).toBe(true);
  });
});
