"use client";

import { Coffee } from "lucide-react";

import { Button } from "@/components/ui/button";

import { categories } from "../data/categories";
import type { DrinkCategoryId } from "../types";

interface CategoryFilterProps {
  active: DrinkCategoryId | "all";
  onChange: (category: DrinkCategoryId | "all") => void;
}

/** A toggle-button group, not a new tab primitive — `Button`'s existing `outline`/`secondary` variants plus `aria-pressed` cover this without adding a shadcn `tabs` dependency for one use site. */
export function CategoryFilter({ active, onChange }: CategoryFilterProps) {
  return (
    <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
      <Button
        variant={active === "all" ? "secondary" : "outline"}
        aria-pressed={active === "all"}
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
            aria-pressed={isActive}
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
