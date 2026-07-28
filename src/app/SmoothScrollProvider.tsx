"use client";

import { ReactLenis } from "lenis/react";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * Lenis is only constructed when motion isn't reduced — never mounted, not
 * just disabled, so native scroll behavior applies untouched under
 * prefers-reduced-motion.
 */
export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const reducedMotion = usePrefersReducedMotion();

  if (reducedMotion) {
    return <>{children}</>;
  }

  return (
    <ReactLenis root options={{ duration: 1.1, smoothWheel: true }}>
      {children}
    </ReactLenis>
  );
}
