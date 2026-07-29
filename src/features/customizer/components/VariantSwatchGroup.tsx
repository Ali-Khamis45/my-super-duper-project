"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CustomizerCategory, CustomizerSelection } from "@/stores/customizer-store";
import { useCustomizerStore } from "@/stores/customizer-store";

export interface SwatchOption {
  id: string;
  label: string;
  /** `undefined`/`null` renders a neutral (non-color) swatch — size/logo/material variants don't have a color to show. */
  hex?: string | null;
}

interface VariantSwatchGroupProps {
  legend: string;
  options: readonly SwatchOption[];
  category: CustomizerCategory;
}

/**
 * One category's swatch row — Color/Size/Sleeve/Lid/Logo/Material all
 * render through this, whether or not the variant has a real color (a
 * neutral pill for size/logo/material, a color-filled circle otherwise).
 * Real `<button>`s throughout, `role="radio"`/`aria-checked` for the
 * committed selection — a single-select group, not independently
 * toggleable buttons (`CategoryFilter.tsx` originally used `aria-pressed`
 * for its own, structurally identical single-select group; harmonized
 * onto this same `radiogroup`/`radio`/`aria-checked` pattern in Sprint
 * 3.8). `min-h-11 min-w-11` (44px) for every touch target regardless of
 * visual size, per this sprint's "touch targets verified" requirement.
 *
 * Preview-before-commit: hover or keyboard focus shows what the cup would
 * look like (`setPreview`) without touching undo/redo history; a real
 * click/Enter/Space commits it (`select`). Distinguishing the two commit
 * paths (`event.detail === 0` is `0` only for a keyboard-triggered click,
 * never a real mouse click) feeds `variant:selected`'s `via` field.
 *
 * Sprint 3.8 perf fix: this component reads its own `category`'s
 * `selection`/`preview` slice directly from `customizer-store` (a
 * primitive `string | null` each) instead of receiving `selectedId`/
 * `previewId`/`onCommit`/`onPreview` as props computed by a shared parent.
 * `CustomizerPanel` previously subscribed to the whole `preview` object
 * and re-rendered — recreating all 6 swatch groups' props — on every
 * single hover anywhere in the panel, not just the hovered group's own;
 * each group now has its own independent subscription, so hovering one
 * category's swatch only ever re-renders that one group.
 */
export function VariantSwatchGroup({ legend, options, category }: VariantSwatchGroupProps) {
  const selectedId = useCustomizerStore((state) => state.selection[category]) as string;
  const previewValue = useCustomizerStore((state) => state.preview?.[category]);
  const previewId = typeof previewValue === "string" ? previewValue : null;
  const select = useCustomizerStore((state) => state.select);
  const setPreview = useCustomizerStore((state) => state.setPreview);

  const onCommit = (id: string, via: "click" | "keyboard") => {
    // See `CustomizerPanel`'s own prior comment on this cast, carried over
    // verbatim: `VariantSwatchGroup` is intentionally generic over plain
    // `string` ids, so this reflects a real, narrower guarantee this
    // component upholds (every option array it's given already only
    // contains its own category's real id values), not an escape hatch.
    select(category, id as CustomizerSelection[CustomizerCategory], via);
  };

  const onPreview = (id: string | null) => {
    // `setPreview` replaces the whole `preview` object, so a fresh read
    // (not the `previewValue` this render already has) avoids clobbering
    // a different category's own in-flight preview with a stale snapshot.
    const currentPreview = useCustomizerStore.getState().preview;
    setPreview(id === null ? null : { ...currentPreview, [category]: id });
  };

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-foreground text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={legend}>
        {options.map((option) => {
          const isSelected = option.id === selectedId;
          const isPreviewing = option.id === previewId;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              // Embeds the group name (e.g. "Sleeve: Charcoal", not just
              // "Charcoal") rather than relying only on the enclosing
              // `radiogroup`'s own `aria-label` for disambiguation — found
              // by testing with a flat, ungrouped accessible-name query and
              // hitting 3 identically-labeled "Charcoal" buttons (Color/
              // Sleeve/Lid all offer it). Real screen readers generally do
              // announce group context too, but not reliably identically
              // across every AT/browser combination — an unambiguous label
              // on the control itself doesn't depend on that.
              aria-label={`${legend}: ${option.label}`}
              onMouseEnter={() => onPreview(option.id)}
              onMouseLeave={() => onPreview(null)}
              onFocus={() => onPreview(option.id)}
              onBlur={() => onPreview(null)}
              onClick={(event) => {
                onCommit(option.id, event.detail === 0 ? "keyboard" : "click");
                onPreview(null);
              }}
              className={cn(
                "focus-visible:ring-ring flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-xs transition-all duration-(--duration-fast) ease-(--ease-premium) focus-visible:ring-2 focus-visible:outline-none",
                isSelected ? "border-brand-accent-500 bg-brand-accent-500/10" : "border-border hover:border-brand-accent-400/60",
                isPreviewing && !isSelected && "border-brand-accent-400/60 bg-brand-accent-500/5",
              )}
            >
              {option.hex ? (
                <span
                  className="border-border/60 relative size-6 rounded-full border"
                  style={{ backgroundColor: option.hex }}
                >
                  {isSelected && (
                    <Check
                      className="absolute inset-0 m-auto size-3.5 mix-blend-difference text-white"
                      aria-hidden="true"
                    />
                  )}
                </span>
              ) : (
                isSelected && <Check className="text-brand-accent-600 dark:text-brand-accent-400 size-3.5" aria-hidden="true" />
              )}
              <span className="max-w-24 truncate text-center">{option.label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
