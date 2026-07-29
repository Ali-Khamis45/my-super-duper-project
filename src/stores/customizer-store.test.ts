import { beforeEach, describe, expect, it } from "vitest";

import { appEvents } from "@/engine/events";

import { DEFAULT_SELECTION, MAX_INGREDIENT_QUANTITY, MIN_INGREDIENT_QUANTITY, useCustomizerStore } from "./customizer-store";

function resetStore() {
  useCustomizerStore.setState({
    selection: DEFAULT_SELECTION,
    preview: null,
    history: [DEFAULT_SELECTION],
    historyIndex: 0,
    savedPresets: [],
  });
}

describe("useCustomizerStore", () => {
  beforeEach(() => {
    resetStore();
  });

  it("starts at the default selection with a single-entry history", () => {
    const state = useCustomizerStore.getState();
    expect(state.selection).toEqual(DEFAULT_SELECTION);
    expect(state.history).toEqual([DEFAULT_SELECTION]);
    expect(state.historyIndex).toBe(0);
  });

  it("select() commits a new value and advances history", () => {
    useCustomizerStore.getState().select("color", "espresso", "click");
    const state = useCustomizerStore.getState();
    expect(state.selection.color).toBe("espresso");
    expect(state.history).toHaveLength(2);
    expect(state.historyIndex).toBe(1);
  });

  it("select() is a no-op when the value hasn't actually changed — no dead history entry", () => {
    useCustomizerStore.getState().select("color", DEFAULT_SELECTION.color, "click");
    const state = useCustomizerStore.getState();
    expect(state.history).toHaveLength(1);
  });

  it("select() emits variant:selected with the right via", () => {
    const events: unknown[] = [];
    const unsub = appEvents.on("variant:selected", (event) => events.push(event));
    useCustomizerStore.getState().select("material", "matte", "keyboard");
    unsub();
    expect(events).toEqual([{ name: "variant:selected", category: "material", variantId: "matte", via: "keyboard" }]);
  });

  it("undo/redo move through history without mutating it", () => {
    const store = useCustomizerStore.getState();
    store.select("color", "espresso", "click");
    store.select("color", "charcoal", "click");
    expect(useCustomizerStore.getState().selection.color).toBe("charcoal");

    useCustomizerStore.getState().undo();
    expect(useCustomizerStore.getState().selection.color).toBe("espresso");

    useCustomizerStore.getState().undo();
    expect(useCustomizerStore.getState().selection.color).toBe(DEFAULT_SELECTION.color);

    // Undo past the beginning is a no-op, not an error / out-of-bounds selection.
    useCustomizerStore.getState().undo();
    expect(useCustomizerStore.getState().selection.color).toBe(DEFAULT_SELECTION.color);

    useCustomizerStore.getState().redo();
    expect(useCustomizerStore.getState().selection.color).toBe("espresso");
  });

  it("a new selection after undo discards the redo tail — standard editor semantics", () => {
    const store = useCustomizerStore.getState();
    store.select("color", "espresso", "click");
    store.select("color", "charcoal", "click");
    useCustomizerStore.getState().undo(); // back to "espresso"
    useCustomizerStore.getState().select("color", "ivory", "click"); // branches away from "charcoal"

    const state = useCustomizerStore.getState();
    expect(state.selection.color).toBe("ivory");
    expect(state.history.map((entry) => entry.color)).toEqual([DEFAULT_SELECTION.color, "espresso", "ivory"]);
    // Redo has nothing to go to — the "charcoal" branch is gone.
    expect(state.historyIndex).toBe(state.history.length - 1);
  });

  it("reset() returns to the default selection and emits preset:reset", () => {
    const events: unknown[] = [];
    const unsub = appEvents.on("preset:reset", (event) => events.push(event));
    useCustomizerStore.getState().select("color", "charcoal", "click");
    useCustomizerStore.getState().reset();
    unsub();
    expect(useCustomizerStore.getState().selection).toEqual(DEFAULT_SELECTION);
    expect(events).toHaveLength(1);
  });

  it("setPreview() never touches history or emits variant:selected", () => {
    const events: unknown[] = [];
    const unsub = appEvents.on("variant:selected", (event) => events.push(event));
    useCustomizerStore.getState().setPreview({ color: "charcoal" });
    unsub();
    expect(useCustomizerStore.getState().preview).toEqual({ color: "charcoal" });
    expect(useCustomizerStore.getState().history).toHaveLength(1);
    expect(events).toEqual([]);
  });

  it("savePreset()/loadPreset() round-trip a selection, and loading emits preset:applied", () => {
    useCustomizerStore.getState().select("color", "terracotta", "click");
    useCustomizerStore.getState().savePreset("My Look");
    const [preset] = useCustomizerStore.getState().savedPresets;
    expect(preset?.name).toBe("My Look");

    useCustomizerStore.getState().reset();
    expect(useCustomizerStore.getState().selection.color).toBe(DEFAULT_SELECTION.color);

    const events: unknown[] = [];
    const unsub = appEvents.on("preset:applied", (event) => events.push(event));
    useCustomizerStore.getState().loadPreset(preset!.id);
    unsub();
    expect(useCustomizerStore.getState().selection.color).toBe("terracotta");
    expect(events).toEqual([{ name: "preset:applied", presetId: preset!.id }]);
  });

  it("deletePreset() removes only the targeted preset", () => {
    const store = useCustomizerStore.getState();
    store.savePreset("A");
    store.savePreset("B");
    const [a, b] = useCustomizerStore.getState().savedPresets;
    useCustomizerStore.getState().deletePreset(a!.id);
    const remaining = useCustomizerStore.getState().savedPresets;
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.id).toBe(b!.id);
  });

  describe("ingredient actions (Sprint 3.3)", () => {
    it("setBaseDrink() sets drink context without touching history", () => {
      useCustomizerStore.getState().setBaseDrink("mocha", "espresso");
      const state = useCustomizerStore.getState();
      expect(state.baseDrinkId).toBe("mocha");
      expect(state.baseDrinkCategory).toBe("espresso");
      expect(state.history).toHaveLength(1);
    });

    it("addIngredient() appends a placement at MIN quantity, advances history, and emits ingredient:added + recipe:changed", () => {
      const events: unknown[] = [];
      const unsubAdded = appEvents.on("ingredient:added", (event) => events.push(event));
      const unsubChanged = appEvents.on("recipe:changed", (event) => events.push(event));
      useCustomizerStore.getState().addIngredient("chocolate");
      unsubAdded();
      unsubChanged();

      const state = useCustomizerStore.getState();
      expect(state.selection.ingredients).toEqual([{ ingredientId: "chocolate", quantity: 1 }]);
      expect(state.history).toHaveLength(2);
      expect(state.historyIndex).toBe(1);
      expect(events).toEqual([
        { name: "ingredient:added", ingredientId: "chocolate" },
        { name: "recipe:changed", ingredientCount: 1 },
      ]);
    });

    it("addIngredient() is a no-op when the ingredient is already present — no duplicate, no dead history entry", () => {
      const store = useCustomizerStore.getState();
      store.addIngredient("chocolate");
      store.addIngredient("chocolate");
      const state = useCustomizerStore.getState();
      expect(state.selection.ingredients).toHaveLength(1);
      expect(state.history).toHaveLength(2);
    });

    it("removeIngredient() drops the placement and emits ingredient:removed + recipe:changed", () => {
      const store = useCustomizerStore.getState();
      store.addIngredient("chocolate");
      store.addIngredient("cream");

      const events: unknown[] = [];
      const unsubRemoved = appEvents.on("ingredient:removed", (event) => events.push(event));
      const unsubChanged = appEvents.on("recipe:changed", (event) => events.push(event));
      useCustomizerStore.getState().removeIngredient("chocolate");
      unsubRemoved();
      unsubChanged();

      const state = useCustomizerStore.getState();
      expect(state.selection.ingredients).toEqual([{ ingredientId: "cream", quantity: 1 }]);
      expect(events).toEqual([
        { name: "ingredient:removed", ingredientId: "chocolate" },
        { name: "recipe:changed", ingredientCount: 1 },
      ]);
    });

    it("removeIngredient() is a no-op for an ingredient that isn't present", () => {
      useCustomizerStore.getState().addIngredient("chocolate");
      const historyLengthBefore = useCustomizerStore.getState().history.length;
      useCustomizerStore.getState().removeIngredient("caramel");
      const state = useCustomizerStore.getState();
      expect(state.selection.ingredients).toHaveLength(1);
      expect(state.history).toHaveLength(historyLengthBefore);
    });

    it("updateIngredientQuantity() clamps to [MIN_INGREDIENT_QUANTITY, MAX_INGREDIENT_QUANTITY] and emits ingredient:updated + recipe:changed", () => {
      useCustomizerStore.getState().addIngredient("chocolate");

      const events: unknown[] = [];
      const unsub = appEvents.on("ingredient:updated", (event) => events.push(event));
      useCustomizerStore.getState().updateIngredientQuantity("chocolate", 99);
      unsub();

      const state = useCustomizerStore.getState();
      expect(state.selection.ingredients[0]?.quantity).toBe(MAX_INGREDIENT_QUANTITY);
      expect(events).toEqual([{ name: "ingredient:updated", ingredientId: "chocolate", quantity: MAX_INGREDIENT_QUANTITY }]);

      useCustomizerStore.getState().updateIngredientQuantity("chocolate", -5);
      expect(useCustomizerStore.getState().selection.ingredients[0]?.quantity).toBe(MIN_INGREDIENT_QUANTITY);
    });

    it("updateIngredientQuantity() is a no-op for a missing ingredient or an unchanged quantity", () => {
      useCustomizerStore.getState().addIngredient("chocolate");
      const historyLengthAfterAdd = useCustomizerStore.getState().history.length;

      useCustomizerStore.getState().updateIngredientQuantity("caramel", 2);
      expect(useCustomizerStore.getState().history).toHaveLength(historyLengthAfterAdd);

      useCustomizerStore.getState().updateIngredientQuantity("chocolate", MIN_INGREDIENT_QUANTITY);
      expect(useCustomizerStore.getState().history).toHaveLength(historyLengthAfterAdd);
    });

    it("reorderIngredient() swaps adjacent placements and emits recipe:changed", () => {
      const store = useCustomizerStore.getState();
      store.addIngredient("chocolate");
      store.addIngredient("cream");
      store.addIngredient("caramel");

      const events: unknown[] = [];
      const unsubReordered = appEvents.on("ingredient:reordered", (event) => events.push(event));
      const unsubChanged = appEvents.on("recipe:changed", (event) => events.push(event));
      useCustomizerStore.getState().reorderIngredient("cream", "up");
      unsubReordered();
      unsubChanged();

      const ids = useCustomizerStore.getState().selection.ingredients.map((entry) => entry.ingredientId);
      expect(ids).toEqual(["cream", "chocolate", "caramel"]);
      expect(events).toEqual([
        { name: "ingredient:reordered", ingredientId: "cream", direction: "up" },
        { name: "recipe:changed", ingredientCount: 3 },
      ]);
    });

    it("reorderIngredient() is a no-op at the boundaries", () => {
      const store = useCustomizerStore.getState();
      store.addIngredient("chocolate");
      store.addIngredient("cream");
      const historyLengthBefore = useCustomizerStore.getState().history.length;

      useCustomizerStore.getState().reorderIngredient("chocolate", "up"); // already first
      useCustomizerStore.getState().reorderIngredient("cream", "down"); // already last
      useCustomizerStore.getState().reorderIngredient("missing", "up"); // doesn't exist

      const state = useCustomizerStore.getState();
      expect(state.selection.ingredients.map((entry) => entry.ingredientId)).toEqual(["chocolate", "cream"]);
      expect(state.history).toHaveLength(historyLengthBefore);
    });

    it("applyIngredientPreset() replaces the whole ingredients array at MIN quantity and emits preset:applied + recipe:changed", () => {
      useCustomizerStore.getState().addIngredient("cinnamon");

      const events: unknown[] = [];
      const unsubApplied = appEvents.on("preset:applied", (event) => events.push(event));
      const unsubChanged = appEvents.on("recipe:changed", (event) => events.push(event));
      useCustomizerStore.getState().applyIngredientPreset(["chocolate", "cream"], "classic-mocha");
      unsubApplied();
      unsubChanged();

      const state = useCustomizerStore.getState();
      expect(state.selection.ingredients).toEqual([
        { ingredientId: "chocolate", quantity: 1 },
        { ingredientId: "cream", quantity: 1 },
      ]);
      expect(events).toEqual([
        { name: "preset:applied", presetId: "classic-mocha" },
        { name: "recipe:changed", ingredientCount: 2 },
      ]);
    });

    it("undo/redo walk through ingredient changes exactly like cosmetic changes", () => {
      const store = useCustomizerStore.getState();
      store.addIngredient("chocolate");
      store.addIngredient("cream");
      expect(useCustomizerStore.getState().selection.ingredients).toHaveLength(2);

      useCustomizerStore.getState().undo();
      expect(useCustomizerStore.getState().selection.ingredients).toEqual([{ ingredientId: "chocolate", quantity: 1 }]);

      useCustomizerStore.getState().redo();
      expect(useCustomizerStore.getState().selection.ingredients).toHaveLength(2);
    });

    it("baseDrinkId/baseDrinkCategory are not part of history — undo never reverts drink context", () => {
      useCustomizerStore.getState().setBaseDrink("mocha", "espresso");
      useCustomizerStore.getState().addIngredient("chocolate");
      useCustomizerStore.getState().undo();
      expect(useCustomizerStore.getState().baseDrinkId).toBe("mocha");
      expect(useCustomizerStore.getState().baseDrinkCategory).toBe("espresso");
    });
  });
});
