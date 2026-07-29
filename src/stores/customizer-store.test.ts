import { beforeEach, describe, expect, it } from "vitest";

import { appEvents } from "@/engine/events";

import { DEFAULT_SELECTION, useCustomizerStore } from "./customizer-store";

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
});
