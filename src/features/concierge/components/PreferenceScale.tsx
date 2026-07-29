"use client";

import { cn } from "@/lib/utils";

import { MAX_SCALE_VALUE, MIN_SCALE_VALUE } from "../data/questions";

interface PreferenceScaleProps {
  legend: string;
  lowLabel: string;
  highLabel: string;
  value: number;
  onChange: (value: number) => void;
}

/** Sweetness/bitterness — a 1-5 scale, not a named-option choice, so it's a small dedicated control rather than forcing `PreferenceOptionGroup`'s string-option shape onto a number. Same accessible radiogroup convention. */
export function PreferenceScale({ legend, lowLabel, highLabel, value, onChange }: PreferenceScaleProps) {
  const values = Array.from({ length: MAX_SCALE_VALUE - MIN_SCALE_VALUE + 1 }, (_, index) => MIN_SCALE_VALUE + index);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-foreground text-sm font-medium">{legend}</legend>
      <div className="flex items-center gap-2" role="radiogroup" aria-label={legend}>
        <span className="text-muted-foreground w-16 text-xs" aria-hidden="true">
          {lowLabel}
        </span>
        {values.map((scaleValue) => {
          const isSelected = scaleValue === value;
          return (
            <button
              key={scaleValue}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${legend}: ${scaleValue} of ${MAX_SCALE_VALUE}`}
              onClick={() => onChange(scaleValue)}
              className={cn(
                "focus-visible:ring-ring flex min-h-11 min-w-11 items-center justify-center rounded-full border text-sm transition-all duration-(--duration-fast) ease-(--ease-premium) focus-visible:ring-2 focus-visible:outline-none",
                isSelected ? "border-brand-accent-500 bg-brand-accent-500/10 font-medium" : "border-border hover:border-brand-accent-400/60",
              )}
            >
              {scaleValue}
            </button>
          );
        })}
        <span className="text-muted-foreground w-16 text-right text-xs" aria-hidden="true">
          {highLabel}
        </span>
      </div>
    </fieldset>
  );
}
