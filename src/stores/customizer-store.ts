import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { appEvents } from "@/engine/events";
import type { DrinkCategoryId } from "@/features/menu/types";

/**
 * Sprint 3.2's dedicated customization state — lives alongside `ui-store.ts`
 * (ADR-0005's "small, flat" Zustand UI state), never inside `engine/`. The
 * brief's own instruction: "Build a dedicated customization state. Do not
 * modify engine stores." Persisted to `sessionStorage`, not `localStorage`
 * — "Persist only session state" (Preset Saving is explicitly session-only
 * too, per the brief).
 *
 * Sprint 3.3 extends this same store with ingredient layers rather than
 * building a second, parallel state/undo system — the brief's own
 * "Undo/Redo integration" instruction, read literally: integrate with what
 * exists.
 */
export type CupColorId = "cream" | "espresso" | "ivory" | "terracotta" | "charcoal";
export type CupSizeId = "small" | "medium" | "large";
export type SleeveVariantId = "kraft" | "charcoal" | "cream" | "none";
export type LidVariantId = "classic" | "charcoal" | "cream" | "none";
export type LogoVariantId = "classic" | "none";
export type MaterialPresetId = "glossy" | "matte" | "metallic";

/** One placed ingredient layer. Array order *is* stack order — reordering the array is "Ingredient Ordering." */
export interface IngredientPlacement {
  ingredientId: string;
  quantity: number;
}

export const MIN_INGREDIENT_QUANTITY = 1;
export const MAX_INGREDIENT_QUANTITY = 3;

export interface CustomizerSelection {
  color: CupColorId;
  size: CupSizeId;
  sleeve: SleeveVariantId;
  lid: LidVariantId;
  logo: LogoVariantId;
  material: MaterialPresetId;
  ingredients: IngredientPlacement[];
}

/** Only the swatch-driven cosmetic categories — `select()`'s domain. Ingredients have their own dedicated actions below since "one value per category" doesn't fit an ordered, variable-length list. */
export type CustomizerCategory = Exclude<keyof CustomizerSelection, "ingredients">;

export const DEFAULT_SELECTION: CustomizerSelection = {
  color: "cream",
  size: "medium",
  sleeve: "kraft",
  lid: "classic",
  logo: "classic",
  material: "glossy",
  ingredients: [],
};

export interface SavedPreset {
  id: string;
  name: string;
  selection: CustomizerSelection;
}

interface CustomizerStoreState {
  selection: CustomizerSelection;
  /** A transient hover/focus preview, never written to `history` and never emits `variant:selected` — only a committed `select()` does. */
  preview: Partial<CustomizerSelection> | null;
  history: CustomizerSelection[];
  historyIndex: number;
  savedPresets: SavedPreset[];
  /**
   * Sprint 3.3 — which drink is being composed. Deliberately *not* part of
   * `CustomizerSelection`/`history`: it's session context set once from
   * `/customize?drink=`, not something a user picks-and-undoes through the
   * swatch UI the way color/size/ingredients are.
   */
  baseDrinkId: string;
  /**
   * Sprint 5.3 — the real backend `Product.Id`, threaded through from `useMenuQuery()`'s live
   * catalog data (`productSummaryToDrink`), never the static `features/menu/data/drinks.ts`
   * array — required before "Add to Cart" can build an orderable `RecipeSnapshot`
   * (`buildRecipeSnapshot` returns `null` without one, the same "never fabricate a snapshot for
   * a drink that doesn't exist" rule it already applied to `baseDrinkId`). `undefined` until the
   * live menu has resolved (or when set via the AI Concierge's static-catalog
   * `applyRecommendationToCustomizer`, which always hands off to `/customize?drink=` next —
   * see `CustomizerExperience.tsx`'s own effect, which re-resolves against live data and
   * overwrites this with the real id before any "Add to Cart" button is reachable).
   */
  baseDrinkProductId: string | undefined;
  baseDrinkCategory: DrinkCategoryId;
  /**
   * Sprint 3.6 — set when `features/concierge/`'s `applyRecommendationToCustomizer`
   * applies a recommendation, so a later "Add to Cart" can snapshot which
   * (if any) AI recommendation this recipe traces back to — the brief's own
   * "Applied AI recommendations (if applicable)." Deliberately not cleared
   * on every subsequent manual tweak (a lightly-adjusted AI suggestion is
   * still meaningfully "AI-recommended"); only `setBaseDrink` from a
   * *different* drink or a full `reset()` clears it, since either means
   * the recommendation no longer describes what's being composed.
   */
  appliedRecommendationId: string | null;
  setPreview: (partial: Partial<CustomizerSelection> | null) => void;
  select: (category: CustomizerCategory, value: CustomizerSelection[CustomizerCategory], via: "click" | "keyboard") => void;
  setBaseDrink: (drinkId: string, productId: string | undefined, category: DrinkCategoryId) => void;
  markRecommendationApplied: (recommendationId: string) => void;
  /**
   * Sprint 3.6 — "Editing items in the cart" rehydrates the customizer
   * from a `RecipeSnapshot` in one commit: `selection` (color/size/
   * ingredients/etc.), `baseDrinkId`/`baseDrinkCategory`, and the
   * recommendation link, all at once — the exact reverse of how
   * `features/cart/lib/buildRecipeSnapshot.ts` builds one, "no data
   * transformations or state reconstruction" in either direction.
   */
  loadRecipeSnapshot: (baseDrinkId: string, baseDrinkProductId: string | undefined, baseDrinkCategory: DrinkCategoryId, selection: CustomizerSelection, appliedRecommendationId: string | null) => void;
  addIngredient: (ingredientId: string) => void;
  removeIngredient: (ingredientId: string) => void;
  updateIngredientQuantity: (ingredientId: string, quantity: number) => void;
  reorderIngredient: (ingredientId: string, direction: "up" | "down") => void;
  applyIngredientPreset: (ingredientIds: string[], presetId: string) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
}

/** Commits a new selection into history, discarding any redo tail — standard undo/redo semantics, same as every text editor. */
function pushHistory(history: CustomizerSelection[], historyIndex: number, next: CustomizerSelection) {
  const truncated = history.slice(0, historyIndex + 1);
  const nextHistory = [...truncated, next];
  return { history: nextHistory, historyIndex: nextHistory.length - 1 };
}

export const useCustomizerStore = create<CustomizerStoreState>()(
  persist(
    (set, get) => ({
      selection: DEFAULT_SELECTION,
      preview: null,
      history: [DEFAULT_SELECTION],
      historyIndex: 0,
      savedPresets: [],
      baseDrinkId: "classic-espresso",
      baseDrinkProductId: undefined,
      baseDrinkCategory: "espresso",
      appliedRecommendationId: null,

      setPreview: (partial) => set({ preview: partial }),

      select: (category, value, via) => {
        const current = get().selection;
        if (current[category] === value) return;
        const next = { ...current, [category]: value };
        const { history, historyIndex } = pushHistory(get().history, get().historyIndex, next);
        set({ selection: next, history, historyIndex, preview: null });
        appEvents.emit({ name: "variant:selected", category, variantId: String(value), via });
      },

      setBaseDrink: (drinkId, productId, category) => {
        // A genuinely different drink invalidates any previously-applied
        // recommendation (it described the *old* drink); re-setting the
        // same drink (the concierge's own `?drink=` effect re-running,
        // for instance) leaves it alone. `baseDrinkProductId` is always
        // re-set regardless — a same-drink call from `CustomizerExperience`'s
        // live-data effect is exactly how a concierge-originated, static-catalog
        // `undefined` productId gets replaced with the real one.
        const changingDrink = get().baseDrinkId !== drinkId;
        set({
          baseDrinkId: drinkId,
          baseDrinkProductId: productId,
          baseDrinkCategory: category,
          appliedRecommendationId: changingDrink ? null : get().appliedRecommendationId,
        });
      },

      markRecommendationApplied: (recommendationId) => set({ appliedRecommendationId: recommendationId }),

      loadRecipeSnapshot: (baseDrinkId, baseDrinkProductId, baseDrinkCategory, selection, appliedRecommendationId) => {
        const { history, historyIndex } = pushHistory(get().history, get().historyIndex, selection);
        set({ selection, history, historyIndex, preview: null, baseDrinkId, baseDrinkProductId, baseDrinkCategory, appliedRecommendationId });
        appEvents.emit({ name: "recipe:changed", ingredientCount: selection.ingredients.length });
      },

      addIngredient: (ingredientId) => {
        const current = get().selection;
        if (current.ingredients.some((entry) => entry.ingredientId === ingredientId)) return;
        const next = { ...current, ingredients: [...current.ingredients, { ingredientId, quantity: MIN_INGREDIENT_QUANTITY }] };
        const { history, historyIndex } = pushHistory(get().history, get().historyIndex, next);
        set({ selection: next, history, historyIndex, preview: null });
        appEvents.emit({ name: "ingredient:added", ingredientId });
        appEvents.emit({ name: "recipe:changed", ingredientCount: next.ingredients.length });
      },

      removeIngredient: (ingredientId) => {
        const current = get().selection;
        if (!current.ingredients.some((entry) => entry.ingredientId === ingredientId)) return;
        const next = { ...current, ingredients: current.ingredients.filter((entry) => entry.ingredientId !== ingredientId) };
        const { history, historyIndex } = pushHistory(get().history, get().historyIndex, next);
        set({ selection: next, history, historyIndex, preview: null });
        appEvents.emit({ name: "ingredient:removed", ingredientId });
        appEvents.emit({ name: "recipe:changed", ingredientCount: next.ingredients.length });
      },

      updateIngredientQuantity: (ingredientId, quantity) => {
        const current = get().selection;
        const clamped = Math.min(MAX_INGREDIENT_QUANTITY, Math.max(MIN_INGREDIENT_QUANTITY, quantity));
        const existing = current.ingredients.find((entry) => entry.ingredientId === ingredientId);
        if (!existing || existing.quantity === clamped) return;
        const next = {
          ...current,
          ingredients: current.ingredients.map((entry) =>
            entry.ingredientId === ingredientId ? { ...entry, quantity: clamped } : entry,
          ),
        };
        const { history, historyIndex } = pushHistory(get().history, get().historyIndex, next);
        set({ selection: next, history, historyIndex, preview: null });
        appEvents.emit({ name: "ingredient:updated", ingredientId, quantity: clamped });
        appEvents.emit({ name: "recipe:changed", ingredientCount: next.ingredients.length });
      },

      reorderIngredient: (ingredientId, direction) => {
        const current = get().selection;
        const index = current.ingredients.findIndex((entry) => entry.ingredientId === ingredientId);
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (index === -1 || targetIndex < 0 || targetIndex >= current.ingredients.length) return;
        const reordered = [...current.ingredients];
        const moved = reordered[index]!;
        reordered[index] = reordered[targetIndex]!;
        reordered[targetIndex] = moved;
        const next = { ...current, ingredients: reordered };
        const { history, historyIndex } = pushHistory(get().history, get().historyIndex, next);
        set({ selection: next, history, historyIndex, preview: null });
        appEvents.emit({ name: "ingredient:reordered", ingredientId, direction });
        appEvents.emit({ name: "recipe:changed", ingredientCount: next.ingredients.length });
      },

      applyIngredientPreset: (ingredientIds, presetId) => {
        const current = get().selection;
        const next = {
          ...current,
          ingredients: ingredientIds.map((ingredientId) => ({ ingredientId, quantity: MIN_INGREDIENT_QUANTITY })),
        };
        const { history, historyIndex } = pushHistory(get().history, get().historyIndex, next);
        set({ selection: next, history, historyIndex, preview: null });
        appEvents.emit({ name: "preset:applied", presetId });
        appEvents.emit({ name: "recipe:changed", ingredientCount: next.ingredients.length });
      },

      undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex <= 0) return;
        const nextIndex = historyIndex - 1;
        const nextSelection = history[nextIndex];
        if (!nextSelection) return;
        set({ selection: nextSelection, historyIndex: nextIndex, preview: null });
      },

      redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex >= history.length - 1) return;
        const nextIndex = historyIndex + 1;
        const nextSelection = history[nextIndex];
        if (!nextSelection) return;
        set({ selection: nextSelection, historyIndex: nextIndex, preview: null });
      },

      reset: () => {
        const { history, historyIndex } = pushHistory(get().history, get().historyIndex, DEFAULT_SELECTION);
        set({ selection: DEFAULT_SELECTION, history, historyIndex, preview: null });
        appEvents.emit({ name: "preset:reset" });
      },

      savePreset: (name) => {
        const preset: SavedPreset = { id: crypto.randomUUID(), name, selection: get().selection };
        set({ savedPresets: [...get().savedPresets, preset] });
      },

      loadPreset: (id) => {
        const preset = get().savedPresets.find((entry) => entry.id === id);
        if (!preset) return;
        const { history, historyIndex } = pushHistory(get().history, get().historyIndex, preset.selection);
        set({ selection: preset.selection, history, historyIndex, preview: null });
        appEvents.emit({ name: "preset:applied", presetId: id });
      },

      deletePreset: (id) => {
        set({ savedPresets: get().savedPresets.filter((entry) => entry.id !== id) });
      },
    }),
    {
      name: "coffeshop-customizer",
      storage: createJSONStorage(() => sessionStorage),
      // `preview` is the only field excluded — it's a transient hover/focus
      // state that should always start `null`, never resume mid-preview.
      // `history`/`historyIndex` ARE persisted alongside `selection`
      // (not dropped) specifically to keep the invariant
      // `history[historyIndex] === selection` true across a reload —
      // persisting `selection` alone while resetting `history` to its
      // initial value would silently break that invariant and make `undo`
      // jump to the default selection instead of doing nothing sane.
      partialize: (state) => ({
        selection: state.selection,
        history: state.history,
        historyIndex: state.historyIndex,
        savedPresets: state.savedPresets,
        baseDrinkId: state.baseDrinkId,
        baseDrinkProductId: state.baseDrinkProductId,
        baseDrinkCategory: state.baseDrinkCategory,
        appliedRecommendationId: state.appliedRecommendationId,
      }),
    },
  ),
);
