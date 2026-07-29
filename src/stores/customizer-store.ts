import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { appEvents } from "@/engine/events";

/**
 * Sprint 3.2's dedicated customization state — lives alongside `ui-store.ts`
 * (ADR-0005's "small, flat" Zustand UI state), never inside `engine/`. The
 * brief's own instruction: "Build a dedicated customization state. Do not
 * modify engine stores." Persisted to `sessionStorage`, not `localStorage`
 * — "Persist only session state" (Preset Saving is explicitly session-only
 * too, per the brief).
 */
export type CupColorId = "cream" | "espresso" | "ivory" | "terracotta" | "charcoal";
export type CupSizeId = "small" | "medium" | "large";
export type SleeveVariantId = "kraft" | "charcoal" | "cream" | "none";
export type LidVariantId = "classic" | "charcoal" | "cream" | "none";
export type LogoVariantId = "classic" | "none";
export type MaterialPresetId = "glossy" | "matte" | "metallic";

export interface CustomizerSelection {
  color: CupColorId;
  size: CupSizeId;
  sleeve: SleeveVariantId;
  lid: LidVariantId;
  logo: LogoVariantId;
  material: MaterialPresetId;
}

export type CustomizerCategory = keyof CustomizerSelection;

export const DEFAULT_SELECTION: CustomizerSelection = {
  color: "cream",
  size: "medium",
  sleeve: "kraft",
  lid: "classic",
  logo: "classic",
  material: "glossy",
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
  setPreview: (partial: Partial<CustomizerSelection> | null) => void;
  select: (category: CustomizerCategory, value: CustomizerSelection[CustomizerCategory], via: "click" | "keyboard") => void;
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

      setPreview: (partial) => set({ preview: partial }),

      select: (category, value, via) => {
        const current = get().selection;
        if (current[category] === value) return;
        const next = { ...current, [category]: value };
        const { history, historyIndex } = pushHistory(get().history, get().historyIndex, next);
        set({ selection: next, history, historyIndex, preview: null });
        appEvents.emit({ name: "variant:selected", category, variantId: String(value), via });
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
      }),
    },
  ),
);
