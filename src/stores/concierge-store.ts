import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { appEvents } from "@/engine/events";
import { DEFAULT_TASTE_PROFILE } from "@/features/concierge/data/questions";
import type { Recommendation, TasteProfile } from "@/features/concierge/types";
import { resolveDrink } from "@/features/menu/data/drinks";

import { useCustomizerStore } from "./customizer-store";

/**
 * Sprint 3.5's dedicated AI Concierge state — same convention
 * `customizer-store.ts` (Sprint 3.2) established: a small, flat, dedicated
 * Zustand store alongside `ui-store.ts`, never inside `engine/`, per the
 * brief's own "AI state remains isolated. No modification of engine
 * stores." `sessionStorage`-persisted — "Persist session only," this
 * sprint's explicit words, the same policy `customizer-store.ts`'s presets
 * and this store's favorites both already follow.
 *
 * Deliberately holds *data* only — `tasteProfile`/`lastRecommendation`/
 * `favorites` and the plain setters for them. The actual "generate a
 * recommendation" orchestration (the non-blocking, cancellable request
 * feel — `useTransition`, see `features/concierge/hooks/useRecommendation.ts`)
 * lives in a hook, not here, since `startTransition`/`isPending` are React
 * render-phase concepts a vanilla store has no way to own.
 */
interface ConciergeStoreState {
  tasteProfile: TasteProfile;
  lastRecommendation: Recommendation | null;
  /** Session-only, per the brief's "Favorite Recommendations (session only)." */
  favorites: Recommendation[];
  setTasteProfileField: <K extends keyof TasteProfile>(key: K, value: TasteProfile[K]) => void;
  resetTasteProfile: () => void;
  setRecommendation: (recommendation: Recommendation) => void;
  /**
   * "One-click Apply to Customizer" — reuses `customizer-store.ts`'s own
   * `setBaseDrink`/`addIngredient` actions directly (imported, not
   * reimplemented) rather than duplicating what a drink+ingredient
   * selection means. "Reuse customizer state... No duplicated models," the
   * brief's own words.
   */
  applyRecommendationToCustomizer: (recommendation: Recommendation) => void;
  toggleFavorite: (recommendation: Recommendation) => void;
}

export const useConciergeStore = create<ConciergeStoreState>()(
  persist(
    (set, get) => ({
      // `DEFAULT_TASTE_PROFILE` resolves season/time-of-day from the real
      // current date at module load — a fresh, real default every session,
      // not a placeholder; `partialize` below restores whatever the user
      // actually chose across a same-session reload, same as `customizer-
      // store.ts`'s own `history`/`selection` invariant.
      tasteProfile: DEFAULT_TASTE_PROFILE,
      lastRecommendation: null,
      favorites: [],

      setTasteProfileField: (key, value) => {
        set({ tasteProfile: { ...get().tasteProfile, [key]: value } });
        appEvents.emit({ name: "taste-profile:updated", field: String(key) });
      },

      resetTasteProfile: () => set({ tasteProfile: DEFAULT_TASTE_PROFILE }),

      setRecommendation: (recommendation) => {
        set({ lastRecommendation: recommendation });
        appEvents.emit({ name: "ai:recommendation-ready", recommendationId: recommendation.id });
      },

      applyRecommendationToCustomizer: (recommendation) => {
        const drink = resolveDrink(recommendation.top.drinkId);
        if (!drink) return;
        const customizer = useCustomizerStore.getState();
        customizer.setBaseDrink(drink.id, drink.category);
        for (const customization of recommendation.suggestedCustomizations) {
          customizer.addIngredient(customization.ingredientId);
        }
        appEvents.emit({ name: "ai:recommendation-applied", recommendationId: recommendation.id });
      },

      toggleFavorite: (recommendation) => {
        const current = get().favorites;
        const alreadyFavorited = current.some((entry) => entry.id === recommendation.id);
        set({
          favorites: alreadyFavorited ? current.filter((entry) => entry.id !== recommendation.id) : [...current, recommendation],
        });
      },
    }),
    {
      name: "coffeshop-concierge",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        tasteProfile: state.tasteProfile,
        lastRecommendation: state.lastRecommendation,
        favorites: state.favorites,
      }),
    },
  ),
);
