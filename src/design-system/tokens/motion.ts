/**
 * Raw motion primitives mirrored from tokens.css's --ease-premium/--duration-*.
 * This is the single source of truth for timing; engine/motion/ builds named,
 * reusable presets on top of these rather than restating the numbers.
 */

/** cubic-bezier(0.16, 1, 0.3, 1) as a Framer Motion-compatible easing array. */
export const easePremium: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const durationMs = {
  fast: 150,
  base: 300,
  slow: 600,
} as const;
