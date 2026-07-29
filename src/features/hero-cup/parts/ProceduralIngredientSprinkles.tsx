import { forwardRef, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Group, InstancedMesh } from "three";

import { createIngredientMaterial, getOrCreateMaterial } from "@/engine/materials";

import { createSprinkleGeometry } from "../geometry/cupGeometry";
import type { CupPartProps } from "../registry/types";

const SPRINKLE_COUNT = 36;
const SCATTER_RADIUS = 0.42;
/** A playful, varied palette — the one ingredient this sprint where a single flat color would read as visibly wrong (real sprinkles are never one color). A deliberate, reviewed exception to the OKLCH-token contract: no 5-color decorative ramp exists in the 3-ramp token system to derive this from (Sprint 3.8 audit). */
const SPRINKLE_COLORS = ["#e85d75", "#f2b134", "#4f9d69", "#5b7fd6", "#f5f5f0"];

/** A tiny, deterministic PRNG (no `Math.random()` during render — this project's `react-hooks/purity` scoping already exempts `features/**` for R3F's imperative model, but a deterministic scatter is honestly the right choice regardless: the pattern should look identical every time this ingredient is added, not reshuffle on every re-render). */
function createSeededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * Sprint 3.3 — the one ingredient given a genuinely distinct shape rather
 * than the shared ring (`ProceduralIngredientRing.tsx`): scattered discrete
 * dots, real geometry reuse via `THREE.InstancedMesh` (one shared tiny
 * sphere geometry, `createSprinkleGeometry`, drawn 36 times in a single
 * draw call — "reuse geometry... avoid unnecessary allocations," literally).
 */
export const ProceduralIngredientSprinkles = forwardRef<Group, CupPartProps>(function ProceduralIngredientSprinkles(
  { position, rotation, scale, visible },
  ref,
) {
  const meshRef = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => createSprinkleGeometry(), []);
  const material = useMemo(
    () =>
      getOrCreateMaterial({ surface: "ingredient", colorHex: "#ffffff", variant: "sprinkles" }, () =>
        createIngredientMaterial(new THREE.Color("#ffffff")),
      ),
    [],
  );

  const instances = useMemo(() => {
    const nextRandom = createSeededRandom(42);
    return Array.from({ length: SPRINKLE_COUNT }, () => {
      const angle = nextRandom() * Math.PI * 2;
      const radius = Math.sqrt(nextRandom()) * SCATTER_RADIUS;
      return {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        y: nextRandom() * 0.015,
        tilt: nextRandom() * Math.PI,
        color: SPRINKLE_COLORS[Math.floor(nextRandom() * SPRINKLE_COLORS.length)] ?? "#ffffff",
      };
    });
  }, []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    for (const [index, instance] of instances.entries()) {
      dummy.position.set(instance.x, instance.y, instance.z);
      dummy.rotation.set(instance.tilt, instance.tilt, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      mesh.setColorAt(index, new THREE.Color(instance.color));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [instances]);

  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale} visible={visible}>
      <instancedMesh ref={meshRef} args={[geometry, material, SPRINKLE_COUNT]} castShadow />
    </group>
  );
});
