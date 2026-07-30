"use client";

import { Coffee } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCategoryStore } from "@/stores/category-store";

import { useCategoriesQuery } from "../hooks/useCategoriesQuery";
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
  // Fetches (and mirrors into `useCategoryStore`) on its own — the one real consumer of the
  // live category list, so there's no value in a parent component fetching just to hand this
  // down as another prop.
  useCategoriesQuery();
  const categories = useCategoryStore((state) => state.categories);

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
