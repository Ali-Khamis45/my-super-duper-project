"use client";

import { motion } from "framer-motion";

import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fadeUp } from "@/engine/motion/presets";
import { GlowCard } from "@/design-system/primitives/GlowCard";

import { resolveCategory } from "../data/categories";
import type { Drink } from "../types";

interface DrinkCardProps {
  drink: Drink;
  onSelect: (drink: Drink) => void;
}

/**
 * A real `<button>` wrapping the card, not a `<div onClick>` — `Card`/
 * `GlowCard` render plain `<div>`s (`GlowCard`'s pointer-tilt effect needs
 * its own `motion.div`, unlike `Button`, which is built on `@base-ui/react`
 * and supports a polymorphic `render` prop), so real keyboard operability
 * comes from a genuine button wrapping the visual card, not from styling a
 * div to look like one.
 */
export function DrinkCard({ drink, onSelect }: DrinkCardProps) {
  const category = resolveCategory(drink.category);
  const Icon = category.icon;

  return (
    <motion.div variants={fadeUp} layout>
      <button
        type="button"
        onClick={() => onSelect(drink)}
        aria-label={`View details for ${drink.name}, $${drink.price.toFixed(2)}`}
        className="focus-visible:ring-ring block w-full cursor-pointer rounded-xl text-left focus-visible:ring-2 focus-visible:outline-none"
      >
        <GlowCard>
          <CardHeader>
            <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
              <Icon className="size-3.5" aria-hidden="true" />
              {category.label}
            </div>
            <CardTitle className="text-lg">{drink.name}</CardTitle>
            <CardDescription className="text-sm text-balance">{drink.tagline}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="font-display text-brand-accent-600 dark:text-brand-accent-400 text-base">
              ${drink.price.toFixed(2)}
            </span>
            <span className="text-muted-foreground text-xs">{drink.tags.join(" · ")}</span>
          </CardContent>
        </GlowCard>
      </button>
    </motion.div>
  );
}
