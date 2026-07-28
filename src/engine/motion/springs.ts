import type { Transition } from "framer-motion";

/**
 * Named spring configs — no CSS equivalent, so unlike easings/durations
 * these have no tokens.css counterpart; they exist only here.
 */
export const springs = {
  /** Slow, heavy settle — idle float, ambient drift. */
  gentle: { type: "spring", stiffness: 60, damping: 18, mass: 1 } satisfies Transition,
  /** Default UI response — hover follow, magnetic pull, tilt. */
  snappy: { type: "spring", stiffness: 300, damping: 24, mass: 0.6 } satisfies Transition,
  /** Playful overshoot — pop/press feedback. */
  bouncy: { type: "spring", stiffness: 420, damping: 16, mass: 0.5 } satisfies Transition,
} as const;
