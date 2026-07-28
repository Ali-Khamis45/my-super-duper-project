/**
 * Pointer position relative to an element's (or viewport's) rect, normalized
 * to [-1, 1]. Moved here from `engine/motion/gestures.ts` during Sprint 2.1
 * — this is coordinate math, not animation timing, and living under
 * `engine/motion/` implied an implicit dependency from `engine/interaction/`
 * on `engine/motion/` that didn't actually reflect anything about motion.
 * Flagged during RC0's contract review (docs/18_ENGINEERING_CONTRACTS.md),
 * corrected here rather than deferred, since it's a pure move with zero
 * behavior change. `engine/motion/gestures.ts` re-imports from here.
 */
export function normalizePointer(clientX: number, clientY: number, rect: DOMRect) {
  const x = ((clientX - rect.left) / rect.width) * 2 - 1;
  const y = ((clientY - rect.top) / rect.height) * 2 - 1;
  return { x, y };
}
