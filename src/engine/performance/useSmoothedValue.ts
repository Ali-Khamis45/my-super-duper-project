import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/**
 * This sprint's Creative Budget item: "smoother transitions between
 * quality tiers... less visible popping." A tier change snaps several
 * parameters instantly (shadow map resolution is a discrete texture size —
 * it genuinely can't be animated continuously without rendering at
 * intermediate resolutions, which isn't practical). Bloom intensity is
 * different: a plain float, cheap to interpolate, and the parameter most
 * directly visible to a user watching the transition happen. This hook
 * damps it toward a target using the same `THREE.MathUtils.damp` technique
 * `engine/camera/CameraRig.tsx` already established for smooth,
 * frame-rate-independent interpolation — not a new pattern.
 *
 * Re-renders only while actively converging (bounded to the transition
 * window, a couple of seconds after a real tier change), never
 * continuously at steady state — `useFrame` checks whether the damped
 * value is still meaningfully different from the target before calling
 * `setState`, so a converged value stops triggering renders entirely.
 */
const CONVERGENCE_EPSILON = 0.001;

export function useSmoothedValue(target: number, dampingFactor = 6): number {
  const [value, setValue] = useState(target);
  const currentRef = useRef(target);
  const targetRef = useRef(target);

  // Refs are written outside render (docs/03_3D_ENGINE.md's lint note) —
  // an effect, not the render body itself, same fix as
  // `useGestureRecognizer.ts`'s "latest handlers" ref in Sprint 2.1.
  useEffect(() => {
    targetRef.current = target;
  });

  useFrame((_state, delta) => {
    const next = THREE.MathUtils.damp(currentRef.current, targetRef.current, dampingFactor, delta);
    currentRef.current = next;
    if (Math.abs(next - value) > CONVERGENCE_EPSILON) {
      setValue(next);
    }
  });

  return value;
}
