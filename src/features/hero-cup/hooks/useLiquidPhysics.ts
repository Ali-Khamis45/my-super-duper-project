import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { RefObject } from "react";

import { appEvents } from "@/engine/events";
import { createLiquidPhysicsState, stepLiquidPhysics, triggerRipple } from "@/engine/physics";
import type { LiquidPhysicsState } from "@/engine/physics";
import { performanceManager } from "@/engine/performance";
import { resolveQualityPolicy } from "@/engine/performance/qualityPolicy";

import type { CupInteractionState } from "./useCupInteractionState";

/** A hitch (tab backgrounded, GC pause) shouldn't make the spring jump — same clamp reasoning as every other `useFrame`-driven animation in this codebase (e.g. `useSmoothedValue`). */
const MAX_STEP_SECONDS = 1 / 30;
/** Perceived strength of a drag-start vs. a release/inertia-stop disturbance — release is the more dramatic "sloshing to a stop" moment. */
const DRAG_START_RIPPLE_MAGNITUDE = 0.5;
const RELEASE_RIPPLE_MAGNITUDE = 0.85;

interface UseLiquidPhysicsOptions {
  /** `useCupInteractionState`'s `velocityRef` — read, never duplicated (see docs/16... "No duplication of interaction state"). */
  velocityRef: RefObject<number>;
  interactionState: CupInteractionState;
  reducedMotion: boolean;
}

/**
 * The single owner of the liquid-physics simulation ("every visual motion
 * has exactly one owner" — the brief's own architecture rule). One
 * `useFrame`, called once per `CupAssembly` mount, regardless of how many
 * parts (coffee, foam, ice) end up reading its output — those parts each
 * own *applying* the result to their own material/transform every frame
 * (see `ProceduralCoffee`/`ProceduralFoam`/`ProceduralIngredientIce`), this
 * hook only owns *computing* it. State lives in a `useRef` (no React
 * re-renders per frame — the same pattern `rotationYRef`/`velocityRef`
 * already use), mutated in place by the pure `stepLiquidPhysics` — no
 * duplicated timers, no polling loop beyond the one `useFrame` R3F already
 * drives every part's own animation from.
 */
export function useLiquidPhysics({ velocityRef, interactionState, reducedMotion }: UseLiquidPhysicsOptions): RefObject<LiquidPhysicsState> {
  const physicsRef = useRef<LiquidPhysicsState>(createLiquidPhysicsState());
  const previousInteractionStateRef = useRef<CupInteractionState>(interactionState);
  const wasLiquidSettledRef = useRef(true);
  const wasSettledRef = useRef(true);

  const tier = performanceManager.tier.useValue();
  const policy = resolveQualityPolicy(tier).coffeePhysics;

  // Ripples are triggered on real interaction transitions — drag starting
  // (a disturbance) and drag/inertia-coast ending (the "sloshing to a
  // stop" moment) — not on a new timer or a duplicated copy of interaction
  // state, just reading the same `interactionState` `CupAssembly` already
  // has. Reduced motion skips new ripples entirely (this project's
  // established "disable outright, don't downgrade" policy — see
  // `CupScene.tsx`'s bloom-transition comment for the same call made
  // elsewhere); an already-active ripple from before a toggle still
  // finishes decaying rather than freezing abruptly.
  useEffect(() => {
    const previous = previousInteractionStateRef.current;
    previousInteractionStateRef.current = interactionState;
    if (previous === interactionState || reducedMotion) return;

    if (interactionState === "drag" && previous !== "drag") {
      triggerRipple(physicsRef.current, policy, DRAG_START_RIPPLE_MAGNITUDE);
    } else if (previous !== "idle" && interactionState === "idle") {
      triggerRipple(physicsRef.current, policy, RELEASE_RIPPLE_MAGNITUDE);
    }
  }, [interactionState, reducedMotion, policy]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, MAX_STEP_SECONDS);
    const physics = physicsRef.current;
    stepLiquidPhysics(physics, { angularVelocity: velocityRef.current, dt, reducedMotion, policy });

    if (physics.liquidSettled !== wasLiquidSettledRef.current) {
      wasLiquidSettledRef.current = physics.liquidSettled;
      appEvents.emit({ name: physics.liquidSettled ? "liquid:stabilized" : "liquid:disturbed" });
    }
    if (physics.settled !== wasSettledRef.current) {
      wasSettledRef.current = physics.settled;
      appEvents.emit({ name: physics.settled ? "physics:settled" : "physics:started" });
    }
  });

  return physicsRef;
}
