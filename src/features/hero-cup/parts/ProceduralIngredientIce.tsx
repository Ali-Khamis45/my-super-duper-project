import { useFrame } from "@react-three/fiber";
import { forwardRef, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Group } from "three";

import { createIngredientMaterial, getOrCreateMaterial, updateMaterialParams } from "@/engine/materials";
import { createLiquidPhysicsState, resolveIceIdleOffset } from "@/engine/physics";
import type { LiquidPhysicsState } from "@/engine/physics";

import { createIngredientRingGeometry } from "../geometry/cupGeometry";
import { materialOverridesToVariant } from "../lib/materialOverridesToVariant";
import type { CupPartProps } from "../registry/types";

const RING_RADIUS = 0.5;
const RING_THICKNESS = 0.05;
/** Ice's own drift, on top of whatever `position`/`scale` the composer already resolved — transform-level, not shader displacement (see this sprint's review: a small discrete object, unlike coffee/foam's continuous disc surface, so a cheap group-transform bob is the "cheaper is correct" choice, not a second vertex-shader pipeline). */
const ICE_LAG_ROTATION_SCALE = 0.6;

const RESTING_PHYSICS_STATE = createLiquidPhysicsState();

/**
 * Sprint 3.4 — "Ice Float Support: float naturally, slight delayed
 * response, minor independent movement." The one ingredient this sprint
 * gives genuinely different *behavior* to (not shape — same shared torus
 * geometry every ring-style ingredient uses; see
 * `geometry/cupGeometry.ts`'s doc comment), the same category of exception
 * Sprint 3.3 made for sprinkles' geometry. Reads `physicsRef` (never
 * mutates it — this part only *applies* physics, `useLiquidPhysics` is the
 * one owner that *computes* it) for: `iceLag` (a slower, smaller follower
 * of the liquid's tilt — "slight delayed response") and the permanent idle
 * bob (`resolveIceIdleOffset` — "minor independent movement," present even
 * at full rest, deliberately excluded from the `settled` flag).
 */
export const ProceduralIngredientIce = forwardRef<Group, CupPartProps>(function ProceduralIngredientIce(
  { position, rotation, scale, visible, materialOverrides, physicsRef },
  ref,
) {
  const innerGroupRef = useRef<Group>(null);
  const geometry = useMemo(() => createIngredientRingGeometry(RING_RADIUS, RING_THICKNESS), []);

  const material = useMemo(() => {
    const colorHex = materialOverrides?.color ?? "#dceef5";
    return getOrCreateMaterial(
      { surface: "ingredient", colorHex, variant: materialOverridesToVariant(undefined, materialOverrides) },
      () => {
        const mat = createIngredientMaterial(new THREE.Color(colorHex));
        if (materialOverrides) updateMaterialParams(mat, "ingredient", materialOverrides);
        return mat;
      },
    ) as THREE.MeshPhysicalMaterial;
  }, [materialOverrides]);

  useFrame(() => {
    const group = innerGroupRef.current;
    if (!group) return;
    const physics: LiquidPhysicsState = physicsRef?.current ?? RESTING_PHYSICS_STATE;
    group.position.y = resolveIceIdleOffset(physics);
    group.rotation.z = physics.iceLag * ICE_LAG_ROTATION_SCALE;
  });

  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale} visible={visible}>
      <group ref={innerGroupRef}>
        <mesh geometry={geometry} material={material} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow />
      </group>
    </group>
  );
});
