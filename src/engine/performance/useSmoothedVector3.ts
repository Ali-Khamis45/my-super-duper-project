import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/**
 * `useSmoothedValue`'s exact pattern (bounded re-render while actively
 * converging, silent at steady state), generalized to a 3-tuple — Sprint
 * 3.7's first real need for a vector version (cup parts damping toward an
 * exploded/assembled target position, a discrete, rare transition, not a
 * continuous per-frame one — see `features/storytelling/README.md`).
 *
 * `dampVector3` is a deliberate, local duplicate of `engine/camera/
 * CameraController.ts`'s identical 4-line helper (Sprint 3.8 fix) rather
 * than an import from it: the frozen `IPerformanceManager` contract states
 * this manager has no outward dependencies, and importing from `engine/
 * camera/` — however trivial the function — was a real, if harmless,
 * violation of that on paper. Same math `CameraRig` uses for preset-to-
 * preset position transitions, just no longer a cross-manager import edge.
 */
function dampVector3(current: THREE.Vector3, target: THREE.Vector3, lambda: number, delta: number) {
  current.x = THREE.MathUtils.damp(current.x, target.x, lambda, delta);
  current.y = THREE.MathUtils.damp(current.y, target.y, lambda, delta);
  current.z = THREE.MathUtils.damp(current.z, target.z, lambda, delta);
}

const CONVERGENCE_EPSILON = 0.001;

export function useSmoothedVector3(target: [number, number, number], dampingFactor = 6): [number, number, number] {
  const [value, setValue] = useState<[number, number, number]>(target);
  const currentRef = useRef(new THREE.Vector3(...target));
  const targetRef = useRef(new THREE.Vector3(...target));

  useEffect(() => {
    targetRef.current.set(...target);
  });

  useFrame((_state, delta) => {
    dampVector3(currentRef.current, targetRef.current, dampingFactor, delta);
    const next = currentRef.current;
    if (
      Math.abs(next.x - value[0]) > CONVERGENCE_EPSILON ||
      Math.abs(next.y - value[1]) > CONVERGENCE_EPSILON ||
      Math.abs(next.z - value[2]) > CONVERGENCE_EPSILON
    ) {
      setValue([next.x, next.y, next.z]);
    }
  });

  return value;
}
