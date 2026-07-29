"use client";

import { Coffee } from "lucide-react";

import { Button } from "@/components/ui/button";

import { categories } from "../data/categories";
import type { DrinkCategoryId } from "../types";

interface CategoryFilterProps {
  active: DrinkCategoryId | "all";
  onChange: (category: DrinkCategoryId | "all") => void;
}

/**
 * A single-select group, not a set of independently-toggleable buttons —
 * `role="radiogroup"`/`role="radio"`/`aria-checked` (Sprint 3.8 fix,
 * matching `VariantSwatchGroup.tsx`'s established pattern: `aria-pressed`
 * communicates independent toggles, which is misleading here since
 * selecting one option always deselects another). `Button`'s existing
 * `outline`/`secondary` variants still provide the visual state.
 */
export function CategoryFilter({ active, onChange }: CategoryFilterProps) {
  return (
    <div role="radiogroup" aria-label="Filter by category" className="flex flex-wrap gap-2">
      <Button
        variant={active === "all" ? "secondary" : "outline"}
        role="radio"
        aria-checked={active === "all"}
        onClick={() => onChange("all")}
      >
        <Coffee className="size-3.5" aria-hidden="true" />
        All
      </Button>
      {categories.map((category) => {
        const Icon = category.icon;
        const isActive = active === category.id;
        return (
          <Button
            key={category.id}
            variant={isActive ? "secondary" : "outline"}
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(category.id)}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {category.label}
          </Button>
        );
      })}
    </div>
  );
}
