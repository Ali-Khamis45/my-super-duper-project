"use client";

import { useEffect, useState } from "react";

import { appEvents } from "@/engine/events";

import { INGREDIENT_PRESETS } from "../data/presets";
import { resolveIngredient } from "../data/ingredients";

/**
 * "Screen-reader announcements" — a visually-hidden `aria-live="polite"`
 * region driven by the store's already-emitted `ingredient:*` events
 * (Event Catalog reused, not duplicated with a parallel diff-the-state
 * mechanism). `role="status"` matches this project's other transient,
 * non-interruptive feedback. `preset:applied` is shared with Sprint 3.2's
 * cosmetic swatch presets too (same event, two callers) — only announce it
 * here when the id resolves to a *composer* preset, so loading a saved cup
 * look doesn't produce a confusing "ingredient preset" announcement.
 */
export function IngredientAnnouncer() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubAdded = appEvents.on("ingredient:added", (event) => {
      setMessage(`${resolveIngredient(event.ingredientId)?.name ?? "Ingredient"} added`);
    });
    const unsubRemoved = appEvents.on("ingredient:removed", (event) => {
      setMessage(`${resolveIngredient(event.ingredientId)?.name ?? "Ingredient"} removed`);
    });
    const unsubUpdated = appEvents.on("ingredient:updated", (event) => {
      setMessage(`${resolveIngredient(event.ingredientId)?.name ?? "Ingredient"} quantity set to ${event.quantity}`);
    });
    const unsubReordered = appEvents.on("ingredient:reordered", (event) => {
      const name = resolveIngredient(event.ingredientId)?.name ?? "Ingredient";
      setMessage(`${name} moved ${event.direction} the stack`);
    });
    const unsubPreset = appEvents.on("preset:applied", (event) => {
      const preset = INGREDIENT_PRESETS.find((entry) => entry.id === event.presetId);
      if (preset) setMessage(`${preset.name} preset applied`);
    });
    return () => {
      unsubAdded();
      unsubRemoved();
      unsubUpdated();
      unsubReordered();
      unsubPreset();
    };
  }, []);

  return (
    <div role="status" aria-live="polite" className="sr-only">
      {message}
    </div>
  );
}
