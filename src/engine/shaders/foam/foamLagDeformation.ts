import * as THREE from "three";

import type { LiquidPhysicsState } from "@/engine/physics";

/**
 * Sprint 3.4 — "Foam shader extends existing foam material" (the brief's
 * own words). Foam's own displacement, not a copy of coffee's: a single
 * `uFoamLag` value (already computed as a lower-amplitude, lower-stiffness
 * spring follower of the liquid's `tiltAngle` — see
 * `engine/physics/liquidPhysics.ts`), no ripple array at all. The brief is
 * explicit — "Slight lag behind liquid. Subtle wobble. Very low amplitude.
 * Never noisy." — a second full ripple system on foam would be exactly the
 * "noisy" this is told not to be, so foam intentionally only reads the one
 * smoothed value, not the coffee surface's individual ripple slots.
 *
 * Same injection point/coordinate-mapping reasoning as coffee's
 * `liquidDeformation.ts` — local Z is world "height" after `ProceduralFoam`'s
 * mesh rotation — and the same accepted simplification (no normal
 * recompute; amplitude is even smaller here than coffee's).
 */
export function injectFoamLagDeformation(shader: THREE.WebGLProgramParametersWithUniforms): void {
  shader.uniforms.uFoamLag = { value: 0 };

  shader.vertexShader = `
uniform float uFoamLag;
${shader.vertexShader}
`.replace(
    "#include <begin_vertex>",
    `#include <begin_vertex>
transformed.z += uFoamLag * transformed.x * 0.6;
`,
  );
}

interface FoamShaderUserData {
  lagShaderRef?: THREE.WebGLProgramParametersWithUniforms;
}

export function captureFoamShaderRef(material: THREE.Material, shader: THREE.WebGLProgramParametersWithUniforms): void {
  (material.userData as FoamShaderUserData).lagShaderRef = shader;
}

/** Called every frame by `ProceduralFoam`'s own `useFrame` — same ownership split as coffee's `updateLiquidDeformationUniforms`. */
export function updateFoamLagUniforms(material: THREE.Material, physics: LiquidPhysicsState): void {
  const shader = (material.userData as FoamShaderUserData).lagShaderRef;
  if (!shader) return;
  shader.uniforms.uFoamLag!.value = physics.foamLag;
}
