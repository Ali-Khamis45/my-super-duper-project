import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { appEvents } from "@/engine/events";
import { DEFAULT_TASTE_PROFILE, resolveCurrentSeason, resolveCurrentTimeOfDay } from "@/features/concierge/data/questions";
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
  /**
   * Sets `season`/`timeOfDay` to the real current date's values — always
   * safe to call client-side (never during SSR/first-paint, see
   * `onRehydrateStorage` below for the one place this is actually called).
   * Exported as a real action, not inlined, so it stays independently
   * testable and callable again later (e.g. a future "refresh" affordance)
   * without duplicating the `resolveCurrentSeason`/`resolveCurrentTimeOfDay`
   * call sites.
   */
  applyCurrentDateDefaults: () => void;
}

const CONCIERGE_STORAGE_KEY = "coffeshop-concierge";

export const useConciergeStore = create<ConciergeStoreState>()(
  persist(
    (set, get) => ({
      // `DEFAULT_TASTE_PROFILE`'s season/timeOfDay are fixed, not date-
      // derived — see that constant's own doc comment for why. The real,
      // current-date value is applied once per fresh session by
      // `onRehydrateStorage` below, never here at store-creation time
      // (which runs identically on the server and would reintroduce the
      // exact hydration mismatch this fix removes).
      tasteProfile: DEFAULT_TASTE_PROFILE,
      lastRecommendation: null,
      favorites: [],

      setTasteProfileField: (key, value) => {
        set({ tasteProfile: { ...get().tasteProfile, [key]: value } });
        appEvents.emit({ name: "taste-profile:updated", field: String(key) });
      },

      applyCurrentDateDefaults: () => {
        const now = new Date();
        set((state) => ({
          tasteProfile: {
            ...state.tasteProfile,
            season: resolveCurrentSeason(now),
            timeOfDay: resolveCurrentTimeOfDay(now),
          },
        }));
      },

      // Not `DEFAULT_TASTE_PROFILE` directly — that constant's season/
      // timeOfDay are the fixed hydration-safe placeholder, not a real
      // default a user-facing "Reset" should restore. Real current-date
      // values are always safe here (this only ever runs from a client
      // event handler, never during SSR).
      resetTasteProfile: () => {
        const now = new Date();
        set({
          tasteProfile: {
            ...DEFAULT_TASTE_PROFILE,
            season: resolveCurrentSeason(now),
            timeOfDay: resolveCurrentTimeOfDay(now),
          },
        });
      },

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
        // Sprint 3.6 — after `setBaseDrink`, never before: a genuinely
        // different drink clears any previously-applied recommendation
        // (see that action's own doc comment), so marking this one applied
        // has to happen second or it would be immediately wiped.
        customizer.markRecommendationApplied(recommendation.id);
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
      name: CONCIERGE_STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        tasteProfile: state.tasteProfile,
        lastRecommendation: state.lastRecommendation,
        favorites: state.favorites,
      }),
      // Runs client-side only, after the hydration-sensitive first render
      // has already committed — the correct place to apply the one piece
      // of real, current-date state this store has. `sessionStorage` still
      // being empty for this key at this exact point is what "a genuinely
      // fresh session, nothing persisted yet" means: if the user already
      // has a persisted profile (their own edits, or a previous mount's
      // real-date apply), leave it alone rather than silently overwriting
      // an explicit choice — same "restore what the user actually chose"
      // invariant `partialize` above already documents.
      onRehydrateStorage: () => (state) => {
        if (typeof window !== "undefined" && window.sessionStorage.getItem(CONCIERGE_STORAGE_KEY) === null) {
          state?.applyCurrentDateDefaults();
        }
      },
    },
  ),
);
