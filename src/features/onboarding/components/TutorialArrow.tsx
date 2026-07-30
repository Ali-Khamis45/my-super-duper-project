"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

import type { OnboardingPlacement } from "../types";

interface TutorialArrowProps {
  targetRect: DOMRect;
  placement: OnboardingPlacement;
  reducedMotion: boolean;
}

/** Rotation (deg) + a small offset so the arrow sits just outside the spotlight hole, pointing back at it — one entry per placement, the card's own anchor side. */
const ARROW_CONFIG: Record<Exclude<OnboardingPlacement, "center">, { rotate: number; style: (rect: DOMRect) => React.CSSProperties }> = {
  top: {
    rotate: 90,
    style: (rect) => ({ left: rect.left + rect.width / 2 - 12, top: rect.top - 40 }),
  },
  bottom: {
    rotate: -90,
    style: (rect) => ({ left: rect.left + rect.width / 2 - 12, top: rect.bottom + 16 }),
  },
  left: {
    rotate: 0,
    style: (rect) => ({ left: rect.left - 40, top: rect.top + rect.height / 2 - 12 }),
  },
  right: {
    rotate: 180,
    style: (rect) => ({ left: rect.right + 16, top: rect.top + rect.height / 2 - 12 }),
  },
};

/** A small animated chevron pointing from the tutorial card toward the spotlighted element — purely decorative (`aria-hidden`), never the only cue (the spotlight ring + card copy already identify the target). */
export function TutorialArrow({ targetRect, placement, reducedMotion }: TutorialArrowProps) {
  if (placement === "center") return null;
  const config = ARROW_CONFIG[placement];
  const isVertical = placement === "top" || placement === "bottom";

  return (
    <motion.div
      className="text-brand-accent-500 fixed z-[65]"
      style={{ ...config.style(targetRect), rotate: config.rotate }}
      animate={reducedMotion ? undefined : isVertical ? { y: [0, 4, 0] } : { x: [0, 4, 0] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden="true"
    >
      <ArrowRight className="size-6" />
    </motion.div>
  );
}
