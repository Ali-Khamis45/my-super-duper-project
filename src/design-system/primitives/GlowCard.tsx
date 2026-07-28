"use client";

import { motion } from "framer-motion";
import type { ComponentProps } from "react";

import { Card } from "@/components/ui/card";
import { useTilt } from "@/engine/motion/gestures";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

/** A Card with an accent glow and a subtle pointer-tilt, both hover-driven. */
export function GlowCard({ className, ...props }: ComponentProps<typeof Card>) {
  const reducedMotion = usePrefersReducedMotion();
  const { style, onPointerMove, onPointerLeave } = useTilt(6);

  return (
    <motion.div
      style={reducedMotion ? undefined : style}
      onPointerMove={reducedMotion ? undefined : onPointerMove}
      onPointerLeave={reducedMotion ? undefined : onPointerLeave}
    >
      <Card
        className={cn(
          "border-border/60 transition-shadow duration-(--duration-base) ease-(--ease-premium)",
          "hover:shadow-[var(--shadow-glow-accent)]",
          className,
        )}
        {...props}
      />
    </motion.div>
  );
}
