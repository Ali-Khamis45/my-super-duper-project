import { create } from "zustand";

import type { DrinkCategory } from "@/features/menu/types";

/** Same hydrated-cache pattern as `menu-store.ts` — populated by `useCategoriesQuery.ts`, read by `CategoryFilter` (replacing its previous direct import of `data/categories.ts`). */
interface CategoryStoreState {
  categories: DrinkCategory[];
  isLoaded: boolean;
  setCategories: (categories: DrinkCategory[]) => void;
}

export const useCategoryStore = create<CategoryStoreState>((set) => ({
  categories: [],
  isLoaded: false,
  setCategories: (categories) => set({ categories, isLoaded: true }),
}));
