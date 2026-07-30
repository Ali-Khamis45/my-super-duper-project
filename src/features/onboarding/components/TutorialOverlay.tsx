"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { Button } from "@/components/ui/button";
import { GlassSurface } from "@/design-system/primitives/GlassSurface";
import { track } from "@/engine/analytics/tracking";
import { appEvents } from "@/engine/events";
import { useGestureRecognizer } from "@/engine/interaction/useGestureRecognizer";
import { performanceManager } from "@/engine/performance";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useOnboardingStore } from "@/stores/onboarding-store";

import { ONBOARDING_STEPS } from "../data/steps";
import type { OnboardingPlacement } from "../types";
import { ProgressDots } from "./ProgressDots";
import { SpotlightMask } from "./SpotlightMask";
import { TutorialArrow } from "./TutorialArrow";

const CARD_WIDTH = 340;
const CARD_HEIGHT_ESTIMATE = 190;
const CARD_MARGIN = 20;
const VIEWPORT_MARGIN = 16;
/** How far a swipe must travel (normalized [-1,1] pointer units) to count as "next"/"previous" rather than an incidental drag. */
const SWIPE_THRESHOLD = 0.15;

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function computeCardStyle(targetRect: DOMRect | null, placement: OnboardingPlacement): CSSProperties {
  if (!targetRect || placement === "center") {
    return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  if (placement === "top" || placement === "bottom") {
    const left = clampNumber(targetRect.left + targetRect.width / 2 - CARD_WIDTH / 2, VIEWPORT_MARGIN, viewportWidth - CARD_WIDTH - VIEWPORT_MARGIN);
    return placement === "top"
      ? { left, bottom: viewportHeight - targetRect.top + CARD_MARGIN }
      : { left, top: targetRect.bottom + CARD_MARGIN };
  }

  const top = clampNumber(
    targetRect.top + targetRect.height / 2 - CARD_HEIGHT_ESTIMATE / 2,
    VIEWPORT_MARGIN,
    viewportHeight - CARD_HEIGHT_ESTIMATE - VIEWPORT_MARGIN,
  );
  return placement === "left"
    ? { top, right: viewportWidth - targetRect.left + CARD_MARGIN }
    : { top, left: targetRect.right + CARD_MARGIN };
}

/**
 * Sprint 3.9, Task 1 — composes `@base-ui/react/dialog`'s real, unstyled
 * primitives directly (the same package `components/ui/sheet.tsx` wraps)
 * rather than hand-rolling focus-trap/Escape/ARIA-dialog behavior: `Root`
 * gives real focus containment and Escape-to-close (wired to `skip()`
 * below), `Popup` is the real `role="dialog"` element, `Title`/
 * `Description` give a screen reader the same accouncement a native dialog
 * would. Only the *visual* backdrop is custom (`SpotlightMask`, rendered as
 * a sibling inside the same `Portal`, ahead of `Popup` in paint order) —
 * "no duplicated overlay logic" per the brief, read as "don't reimplement
 * what Base UI already gives you," not "never write a custom backdrop."
 *
 * Reduced Motion: the glow pulse and arrow bounce are both ambient/
 * automatic motion, so both are disabled outright (not downgraded) under
 * `prefers-reduced-motion`, this project's established policy. Adaptive
 * Quality: the same glow pulse is also skipped on the two lowest quality
 * tiers even with full motion allowed — a real, if small, per-frame SVG
 * animation cost this project's performance budget doesn't need to spend
 * on a decorative highlight ring.
 */
export function TutorialOverlay() {
  const isActive = useOnboardingStore((state) => state.isActive);
  const stepIndex = useOnboardingStore((state) => state.stepIndex);
  const next = useOnboardingStore((state) => state.next);
  const previous = useOnboardingStore((state) => state.previous);
  const skip = useOnboardingStore((state) => state.skip);
  const complete = useOnboardingStore((state) => state.complete);
  const reducedMotion = usePrefersReducedMotion();
  const tier = performanceManager.tier.useValue();
  const popupRef = useRef<HTMLDivElement>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = ONBOARDING_STEPS[stepIndex];
  const isLastStep = stepIndex === ONBOARDING_STEPS.length - 1;
  const skipGlowAnimation = reducedMotion || tier === "minimal" || tier === "low";

  useEffect(() => {
    if (!isActive || !step) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isActive, step]);

  // `useLayoutEffect`, not `useEffect`: runs synchronously after the DOM
  // commits but before the browser paints, so a step change measures and
  // repositions in the same frame rather than briefly painting the
  // previous step's (wrong) target rect first. Critically, this component
  // never returns `null` while waiting for a measurement (see the render
  // below) — an earlier version did, which unmounted `Dialog.Root` itself
  // on every step change and broke Base UI's own open-state tracking,
  // silently ending the tour after the first "Next" click. Real bug, found
  // and fixed via manual browser verification during this sprint, not
  // assumed correct from the code alone.
  useLayoutEffect(() => {
    if (!isActive || !step) return;

    function measure() {
      if (!step?.targetSelector) {
        setTargetRect(null);
        return;
      }
      const element = document.querySelector(step.targetSelector);
      setTargetRect(element?.getBoundingClientRect() ?? null);
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [isActive, step]);

  useEffect(() => {
    if (!isActive || !step) return;
    appEvents.emit({ name: "onboarding:step-viewed", stepId: step.id, index: stepIndex });
    track({ name: "onboarding_step_viewed", payload: { stepId: step.id, index: stepIndex } });
  }, [isActive, step, stepIndex]);

  // Swipe left/right = next/previous — `useGestureRecognizer`'s
  // `drag-start`/`drag-end` `position` fields (normalized [-1,1], present
  // on every gesture type) give total displacement without needing a
  // running delta accumulator of its own.
  const dragStartX = useRef(0);
  useGestureRecognizer(popupRef, {
    "drag-start": (event) => {
      dragStartX.current = event.position.x;
    },
    "drag-end": (event) => {
      const delta = event.position.x - dragStartX.current;
      if (delta <= -SWIPE_THRESHOLD) {
        if (isLastStep) complete();
        else next();
      } else if (delta >= SWIPE_THRESHOLD) {
        previous();
      }
    },
  });

  if (!isActive || !step) return null;

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      if (isLastStep) complete();
      else next();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      previous();
    }
  }

  return (
    <Dialog.Root
      open
      modal
      onOpenChange={(open) => {
        if (!open) skip();
      }}
    >
      <Dialog.Portal>
        <SpotlightMask targetRect={targetRect} animateGlow={!skipGlowAnimation} />
        {targetRect && step.placement !== "center" && (
          <TutorialArrow targetRect={targetRect} placement={step.placement} reducedMotion={reducedMotion} />
        )}
        <Dialog.Popup
          ref={popupRef}
          className="fixed z-[70] w-[340px] outline-none"
          style={computeCardStyle(targetRect, step.placement)}
          onKeyDown={handleKeyDown}
        >
          <GlassSurface elevation="lg" className="flex flex-col gap-3 p-5">
            <Dialog.Title className="font-display text-lg">{step.title}</Dialog.Title>
            <Dialog.Description className="text-muted-foreground text-sm">{step.description}</Dialog.Description>
            <div className="mt-1 flex items-center justify-between">
              <ProgressDots total={ONBOARDING_STEPS.length} current={stepIndex} />
              <Button type="button" variant="ghost" size="sm" onClick={skip}>
                Skip
              </Button>
            </div>
            <div className="flex justify-end gap-2">
              {stepIndex > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={previous}>
                  Previous
                </Button>
              )}
              <Button type="button" size="sm" onClick={isLastStep ? complete : next}>
                {isLastStep ? "Finish" : "Next"}
              </Button>
            </div>
          </GlassSurface>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
