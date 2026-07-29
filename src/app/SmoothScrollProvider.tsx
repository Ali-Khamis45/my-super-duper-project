"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ReactLenis, useLenis } from "lenis/react";
import { useEffect } from "react";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Sprint 3.7 — the documented (`docs/04_MOTION_ENGINE.md`), previously
 * unbuilt GSAP+Lenis wiring: GSAP's ticker becomes the sole rAF driver
 * (`autoRaf: false` on `ReactLenis` below), and every Lenis scroll tick
 * re-syncs `ScrollTrigger`. Mounted globally (every route already goes
 * through `SmoothScrollProvider`), not conditionally per-route — inert
 * everywhere `features/storytelling/` doesn't register a `ScrollTrigger`
 * (an idle `ScrollTrigger.update()` call with zero triggers registered is
 * a no-op), and functionally identical scroll smoothness for every other
 * route (still driven by the same rAF cadence, just from `gsap.ticker`
 * instead of Lenis's own internal one).
 */
function GsapLenisTicker() {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;

    lenis.on("scroll", ScrollTrigger.update);
    const update = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(update);
      lenis.off("scroll", ScrollTrigger.update);
    };
  }, [lenis]);

  return null;
}

/**
 * Lenis is only constructed when motion isn't reduced — never mounted, not
 * just disabled, so native scroll behavior applies untouched under
 * prefers-reduced-motion. `features/storytelling/`'s own reduced-motion
 * path (see its README) never registers a scroll-scrubbed `ScrollTrigger`
 * either, so the two stay consistent: no Lenis smoothing and no
 * GSAP-scroll-driven storytelling at the same time.
 */
export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const reducedMotion = usePrefersReducedMotion();

  if (reducedMotion) {
    return <>{children}</>;
  }

  return (
    <ReactLenis root options={{ duration: 1.1, smoothWheel: true, autoRaf: false }}>
      <GsapLenisTicker />
      {children}
    </ReactLenis>
  );
}
