"use client";

import { motion } from "framer-motion";
import { CoffeeIcon } from "lucide-react";

import { fadeIn } from "@/engine/motion/presets";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface MenuEmptyStateProps {
  query: string;
}

/** A real, written-with-care empty state, not a bare "No results" — small delight the Creative Budget asks for, cheap to build, easy to skip if it didn't earn its place, but it does: this is the one moment search/filter can otherwise feel broken rather than just empty. */
export function MenuEmptyState({ query }: MenuEmptyStateProps) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? false : "hidden"}
      animate={reducedMotion ? undefined : "visible"}
      variants={fadeIn}
      className="flex flex-col items-center gap-3 py-20 text-center"
    >
      <CoffeeIcon className="text-muted-foreground size-8" aria-hidden="true" />
      <p className="font-display text-lg">Nothing matches {query ? `"${query}"` : "that filter"}.</p>
      <p className="text-muted-foreground max-w-sm text-sm text-balance">
        Try a different word, or clear the filter — the whole menu is worth a second look.
      </p>
    </motion.div>
  );
}
