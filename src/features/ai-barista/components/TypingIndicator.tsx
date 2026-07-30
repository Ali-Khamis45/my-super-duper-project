"use client";

import { motion } from "framer-motion";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/** Three dots, staggered bounce. Reduced motion shows them static — still communicates "thinking," just without the ambient animation. */
export function TypingIndicator() {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className="flex items-center gap-1 py-1" role="status" aria-label="The AI barista is thinking">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="bg-muted-foreground/60 size-1.5 rounded-full"
          animate={reducedMotion ? undefined : { y: [0, -4, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
