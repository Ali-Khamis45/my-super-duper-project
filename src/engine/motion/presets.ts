import type { Variants } from "framer-motion";

import { durations } from "./durations";
import { easings } from "./easings";
import { springs } from "./springs";

// `magnetic` and `tilt` — the pointer-following/tilt presets — are hooks
// (`useMagnetic`/`useTilt` in ./gestures) and are imported directly from
// there rather than re-exported under a non-"use"-prefixed name here, so
// eslint-plugin-react-hooks can still recognize them as hooks by convention.

/** Simple opacity entrance — nav chrome, small UI reveals. */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: durations.base, ease: easings.premium } },
};

/** Opacity + upward settle — headlines, section intros. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.base, ease: easings.premium },
  },
};

/** Press feedback — pair with `whileTap="pressed"`. */
export const pop: Variants = {
  rest: { scale: 1 },
  pressed: { scale: 0.96, transition: springs.bouncy },
};

/** Parent variant for staggered children — pair with `fadeUp` on each child. */
export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

/**
 * Idle float rhythm — currently only a period, consumed by the hero cup's
 * 3D idle-float `useFrame` loop (CupAssembly). A 2D `floatAnimate()` helper
 * and a `parallax` strength-multiplier export existed here in an earlier
 * draft but had zero real consumers (no 2D floating element, no
 * scroll-parallax feature was ever built against them) and were removed —
 * see docs/06_CODING_STANDARDS.md's "no half-finished code" rule. Re-add
 * either only alongside the feature that actually needs it.
 */
export const float = {
  periodSeconds: 4,
};
