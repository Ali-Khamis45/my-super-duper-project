import * as THREE from "three";

import type { LiquidPhysicsState } from "@/engine/physics";

/**
 * Sprint 3.4 — the vertex-displacement half of "Coffee shader becomes the
 * owner of liquid deformation" (the brief's own words). Physically-lit path
 * (docs/13_SHADER_ARCHITECTURE.md): `onBeforeCompile` vertex injection, the
 * same convention `applyFresnelRim` already uses for the fragment side —
 * composed together in `CoffeeSurface.ts`'s single `onBeforeCompile`
 * callback, not two competing ones.
 *
 * Injected immediately after `#include <begin_vertex>` (which is what
 * *sets* `transformed` — displacing it before that include would displace
 * nothing, since it doesn't exist yet). `transformed.z` is used because
 * `ProceduralCoffee`'s mesh applies a `[-Math.PI / 2, 0, 0]` rotation,
 * which maps local Z to world Y (verified against this project's own
 * geometry setup, not assumed) — so writing local Z is writing world
 * "height," exactly like the fresnel rim's fragment injection point was
 * verified against the installed Three.js source rather than assumed.
 *
 * Deliberately skips recomputing vertex normals after displacement (a real,
 * accepted simplification — see docs/reviews/sprint-3.4-review.md): the
 * displacement amplitude is small enough ("a wobble, not a dramatic lean,"
 * per the brief's Creative Budget) that the lighting error from stale
 * normals is not visually significant, and a correct analytic/finite-
 * difference normal recompute would meaningfully raise this shader's cost
 * for a wobble nobody would notice is slightly mis-lit.
 */
export function injectLiquidDeformation(shader: THREE.WebGLProgramParametersWithUniforms): void {
  shader.uniforms.uTiltAngle = { value: 0 };
  shader.uniforms.uRippleAmplitude = { value: new THREE.Vector4() };
  shader.uniforms.uRippleElapsed = { value: new THREE.Vector4() };

  shader.vertexShader = `
uniform float uTiltAngle;
uniform vec4 uRippleAmplitude;
uniform vec4 uRippleElapsed;

float coffeeRippleWave(float amplitude, float elapsedTime, float dist) {
  if (amplitude <= 0.0001) return 0.0;
  return amplitude * sin(dist * 16.0 - elapsedTime * 8.0) * exp(-dist * 2.2) * exp(-elapsedTime * 0.6);
}
${shader.vertexShader}
`.replace(
    "#include <begin_vertex>",
    `#include <begin_vertex>
float liquidDist = length(transformed.xy);
float liquidDisplacement = uTiltAngle * transformed.x;
liquidDisplacement += coffeeRippleWave(uRippleAmplitude.x, uRippleElapsed.x, liquidDist);
liquidDisplacement += coffeeRippleWave(uRippleAmplitude.y, uRippleElapsed.y, liquidDist);
liquidDisplacement += coffeeRippleWave(uRippleAmplitude.z, uRippleElapsed.z, liquidDist);
liquidDisplacement += coffeeRippleWave(uRippleAmplitude.w, uRippleElapsed.w, liquidDist);
transformed.z += liquidDisplacement;
`,
  );
}

interface CoffeeShaderUserData {
  liquidShaderRef?: THREE.WebGLProgramParametersWithUniforms;
}

/** Called once, inside `onBeforeCompile`, right after `injectLiquidDeformation` — the standard Three.js escape hatch for later, per-frame uniform writes on an `onBeforeCompile`-injected shader (there is no other supported handle back to it). */
export function captureLiquidShaderRef(material: THREE.Material, shader: THREE.WebGLProgramParametersWithUniforms): void {
  (material.userData as CoffeeShaderUserData).liquidShaderRef = shader;
}

/**
 * Called every frame by `ProceduralCoffee`'s own `useFrame` — this module
 * only owns *how displacement is computed from physics values*, not *when*
 * ("every visual motion has exactly one owner" the brief itself states;
 * the owner of "read physics state and push it into materials every
 * frame" is each part component, matching how `ProceduralSteam` already
 * owns writing its own `uTime`/`uOpacity` every frame).
 */
export function updateLiquidDeformationUniforms(material: THREE.Material, physics: LiquidPhysicsState): void {
  const shader = (material.userData as CoffeeShaderUserData).liquidShaderRef;
  if (!shader) return; // Not yet compiled (first frame(s) before the GPU program is ready) — a safe no-op, not an error.

  shader.uniforms.uTiltAngle!.value = physics.tiltAngle;

  const amplitude = shader.uniforms.uRippleAmplitude!.value as THREE.Vector4;
  const elapsed = shader.uniforms.uRippleElapsed!.value as THREE.Vector4;
  // `MAX_RIPPLE_SLOTS` is 4, matching Vec4 exactly — if that constant ever
  // changes, this indexing and the shader's `vec4` uniforms need to change
  // together (see `engine/physics/types.ts`'s doc comment on the constant).
  amplitude.set(
    physics.ripples[0]?.amplitude ?? 0,
    physics.ripples[1]?.amplitude ?? 0,
    physics.ripples[2]?.amplitude ?? 0,
    physics.ripples[3]?.amplitude ?? 0,
  );
  elapsed.set(
    physics.ripples[0]?.elapsedSeconds ?? 0,
    physics.ripples[1]?.elapsedSeconds ?? 0,
    physics.ripples[2]?.elapsedSeconds ?? 0,
    physics.ripples[3]?.elapsedSeconds ?? 0,
  );
}
