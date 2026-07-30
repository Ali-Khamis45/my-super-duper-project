"use client";

import { motion } from "framer-motion";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface AiBaristaSteamProps {
  className?: string;
}

/**
 * Sprint 3.9, Task 4 — "a subtle coffee-steam animation behind the header,"
 * a cheap 2D DOM wisp for chrome that isn't a 3D scene (the real shader
 * steam sim lives in `engine/shaders/steam/`, scoped to the hero cup — no
 * reason to drag R3F into a chat header for three blurred divs). Ambient,
 * not direct-manipulation, so it's hidden outright under reduced motion
 * rather than downgraded, this project's established policy.
 */
export function AiBaristaSteam({ className }: AiBaristaSteamProps) {
  const reducedMotion = usePrefersReducedMotion();
  if (reducedMotion) return null;

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="bg-cream-100/50 dark:bg-cream-50/15 absolute bottom-0 h-8 w-3 rounded-full blur-md"
          style={{ left: `${28 + i * 22}%` }}
          animate={{ y: [-2, -26, -2], opacity: [0, 0.7, 0], scale: [0.8, 1.15, 0.8] }}
          transition={{ duration: 3.6, repeat: Infinity, delay: i * 0.85, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
