"use client";

import { motion } from "framer-motion";

import { espresso, oklchToCssRgba } from "@/design-system/tokens/colors";

interface SpotlightMaskProps {
  targetRect: DOMRect | null;
  /** Ambient glow pulse — off under reduced motion (this project's "disable outright" policy) and on the two lowest quality tiers (a real, if small, perf cost — see `TutorialOverlay`'s own doc comment on the Adaptive Quality integration). */
  animateGlow: boolean;
}

const SPOTLIGHT_PADDING = 8;
const SPOTLIGHT_RADIUS = 12;
const BACKDROP_COLOR = oklchToCssRgba(espresso[900], 0.72);

/**
 * Sprint 3.9, Task 1 — an SVG mask, not a CSS `clip-path` polygon: a
 * rounded-rect "hole" cut into a full-viewport scrim via `<mask>` is exact
 * and trivially animatable (just the hole's `x`/`y`/`width`/`height`), where
 * a clip-path would need a hand-built inverted polygon path recomputed the
 * same way anyway. Purely decorative (`aria-hidden`) — the real
 * dialog/focus semantics live on `TutorialOverlay`'s `Dialog.Popup`, not
 * here.
 */
export function SpotlightMask({ targetRect, animateGlow }: SpotlightMaskProps) {
  const hole = targetRect
    ? {
        x: targetRect.left - SPOTLIGHT_PADDING,
        y: targetRect.top - SPOTLIGHT_PADDING,
        width: targetRect.width + SPOTLIGHT_PADDING * 2,
        height: targetRect.height + SPOTLIGHT_PADDING * 2,
      }
    : null;

  return (
    <div className="fixed inset-0 z-[60]" aria-hidden="true">
      <svg className="absolute inset-0 h-full w-full">
        <defs>
          <mask id="onboarding-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {hole && <rect x={hole.x} y={hole.y} width={hole.width} height={hole.height} rx={SPOTLIGHT_RADIUS} fill="black" />}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill={BACKDROP_COLOR} mask="url(#onboarding-spotlight-mask)" />
        {hole && (
          <motion.rect
            x={hole.x}
            y={hole.y}
            width={hole.width}
            height={hole.height}
            rx={SPOTLIGHT_RADIUS}
            fill="none"
            strokeWidth={2}
            style={{ stroke: "var(--color-brand-accent-500)" }}
            animate={animateGlow ? { opacity: [0.5, 1, 0.5] } : undefined}
            initial={false}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </svg>
    </div>
  );
}
