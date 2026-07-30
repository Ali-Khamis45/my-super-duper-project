"use client";

import { AnimatePresence, motion, type Variants } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

import { track } from "@/engine/analytics/tracking";
import { fadeUp, stagger } from "@/engine/motion/presets";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useSearchStore } from "@/stores/search-store";

import { useMenuQuery } from "../hooks/useMenuQuery";
import { useSearchQuery } from "../hooks/useSearchQuery";
import type { Drink, DrinkCategoryId } from "../types";
import { CategoryFilter } from "./CategoryFilter";
import { DrinkCard } from "./DrinkCard";
import { DrinkDetailDialog } from "./DrinkDetailDialog";
import { MenuEmptyState } from "./MenuEmptyState";
import { MenuErrorState } from "./MenuErrorState";
import { MenuLoadingState } from "./MenuLoadingState";
import { MenuSearch } from "./MenuSearch";

/**
 * Sprint 5.2: the catalog is now real, live data (`useMenuQuery`/`useSearchQuery`,
 * `/api/v1/menu` and `/api/v1/search`) — category filtering stays a synchronous, client-side
 * `useMemo` derivation (the fetched list is small and already loaded; no reason to round-trip
 * for it), but the *text query* now hits the real ranked full-text search this sprint's Phase 5
 * built, rather than a local substring match.
 */
function matchesCategory(drink: Drink, category: DrinkCategoryId | "all"): boolean {
  return category === "all" || drink.category === category;
}

/**
 * The shared `stagger` preset (`engine/motion/presets.ts`) is tuned for
 * small headline groups (2-4 elements); at its 0.06s-per-child interval,
 * a 14-item catalog grid takes over a second to finish settling — real,
 * measured via a live render, not assumed — which reads as sluggish for a
 * page whose whole job is letting someone browse quickly. A tighter,
 * grid-specific interval (kept local here, not promoted to the shared
 * presets file, since this is still this grid's only consumer — the same
 * "no zero-consumer scaffolding" discipline `hero-cup/README.md` applies).
 */
const catalogStagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.025, delayChildren: 0.02 } },
};

export function MenuExperience() {
  const reducedMotion = usePrefersReducedMotion();
  const query = useSearchStore((state) => state.query);
  const setQuery = useSearchStore((state) => state.setQuery);
  const [category, setCategory] = useState<DrinkCategoryId | "all">("all");
  const [selectedDrink, setSelectedDrink] = useState<Drink | null>(null);

  const isSearching = query.trim().length > 0;
  const menuQuery = useMenuQuery();
  const searchQuery = useSearchQuery(query);

  const isLoading = isSearching ? searchQuery.isLoading : menuQuery.isLoading;
  const isError = isSearching ? searchQuery.isError : menuQuery.isError;

  const filtered = useMemo(() => {
    const sourceList = isSearching ? (searchQuery.data ?? []) : (menuQuery.data ?? []);
    return sourceList.filter((drink) => matchesCategory(drink, category));
  }, [isSearching, searchQuery.data, menuQuery.data, category]);

  // Debounced, not per-keystroke — "real, minimal event surface"
  // (docs/engine/analytics/events.ts) means a settled search, not a flood
  // of events while the user is still typing.
  useEffect(() => {
    if (!query) return;
    const timeout = setTimeout(() => {
      track({ name: "menu_searched", payload: { query, resultCount: filtered.length } });
    }, 500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per settled query, not on every `filtered` identity change
  }, [query]);

  function handleCategoryChange(next: DrinkCategoryId | "all") {
    setCategory(next);
    track({ name: "menu_category_filtered", payload: { category: next } });
  }

  function handleSelectDrink(drink: Drink) {
    setSelectedDrink(drink);
    track({ name: "menu_drink_viewed", payload: { drinkId: drink.id } });
  }

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-6 pt-28 pb-20">
      <motion.div
        initial={reducedMotion ? false : "hidden"}
        animate={reducedMotion ? undefined : "visible"}
        variants={stagger}
        className="flex flex-col items-center text-center"
      >
        <motion.p
          variants={fadeUp}
          className="text-brand-accent-600 dark:text-brand-accent-400 text-sm font-medium tracking-[0.2em] uppercase"
        >
          Menu
        </motion.p>
        <motion.h1 variants={fadeUp} className="font-display text-display mt-3 leading-(--text-display--line-height)">
          Every cup, before you order it.
        </motion.h1>
        <motion.p variants={fadeUp} className="text-muted-foreground mt-4 max-w-lg text-lg text-balance">
          Espresso, cold brew, seasonal, and tea — search, filter, and get to know a drink before it&apos;s yours.
        </motion.p>
      </motion.div>

      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CategoryFilter active={category} onChange={handleCategoryChange} />
        <MenuSearch value={query} onChange={setQuery} />
      </div>

      <div className="mt-8">
        {isError ? (
          <MenuErrorState onRetry={() => (isSearching ? searchQuery.refetch() : menuQuery.refetch())} />
        ) : isLoading ? (
          <MenuLoadingState />
        ) : filtered.length === 0 ? (
          <MenuEmptyState query={query} />
        ) : (
          <motion.div
            layout={!reducedMotion}
            initial={reducedMotion ? false : "hidden"}
            animate={reducedMotion ? undefined : "visible"}
            variants={catalogStagger}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((drink) => (
                <DrinkCard key={drink.id} drink={drink} onSelect={handleSelectDrink} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <DrinkDetailDialog drink={selectedDrink} onOpenChange={(open) => !open && setSelectedDrink(null)} />
    </main>
  );
}
