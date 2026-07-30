import { create } from "zustand";

import type { Drink } from "@/features/menu/types";

/**
 * Sprint 5.2's canonical, live-catalog cache — hydrated once by `useMenuQuery.ts` on a
 * successful `/api/v1/menu` fetch, then read by every consumer that previously imported the
 * static `drinks` array's full list: `MenuExperience`'s grid, `CustomizerExperience`'s
 * `?drink=` resolution, and `useRecommendation.ts`'s candidate pool. A plain (non-persisted)
 * Zustand store, same "ephemeral, client-only state" convention as `ui-store.ts` — this is a
 * cache of remote data, not state that should survive a refresh independent of a real refetch.
 */
interface MenuStoreState {
  drinks: Drink[];
  isLoaded: boolean;
  setDrinks: (drinks: Drink[]) => void;
}

export const useMenuStore = create<MenuStoreState>((set) => ({
  drinks: [],
  isLoaded: false,
  setDrinks: (drinks) => set({ drinks, isLoaded: true }),
}));
