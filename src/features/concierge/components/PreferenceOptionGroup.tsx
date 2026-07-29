"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

interface PreferenceOptionGroupProps<TValue extends string> {
  legend: string;
  options: readonly { value: TValue; label: string }[];
  selected: TValue;
  onSelect: (value: TValue) => void;
}

/**
 * The questionnaire's single-choice control — the same accessible
 * `role="radiogroup"`/`role="radio"` convention `features/customizer/`'s
 * `VariantSwatchGroup` established in Sprint 3.2, without that component's
 * hover/focus 3D-preview machinery (there's no live preview here — a
 * questionnaire answer doesn't change anything until "Get my recommendation"
 * is pressed), so this is its own small component rather than a force-fit
 * reuse of one built for a different purpose. Real `<button>`s throughout —
 * reachable by Tab, activated by Enter/Space/click — for the brief's
 * "Keyboard support" without any custom key handling.
 */
export function PreferenceOptionGroup<TValue extends string>({ legend, options, selected, onSelect }: PreferenceOptionGroupProps<TValue>) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-foreground text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={legend}>
        {options.map((option) => {
          const isSelected = option.value === selected;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${legend}: ${option.label}`}
              onClick={() => onSelect(option.value)}
              className={cn(
                "focus-visible:ring-ring flex min-h-11 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-all duration-(--duration-fast) ease-(--ease-premium) focus-visible:ring-2 focus-visible:outline-none",
                isSelected ? "border-brand-accent-500 bg-brand-accent-500/10" : "border-border hover:border-brand-accent-400/60",
              )}
            >
              {isSelected && <Check className="text-brand-accent-600 dark:text-brand-accent-400 size-3.5" aria-hidden="true" />}
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
