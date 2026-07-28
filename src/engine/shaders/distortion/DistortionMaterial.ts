import * as THREE from "three";

import { noise2DGLSL } from "../common/noise";
import { createPerInstanceUniforms } from "../common/uniforms";
import { shaderRegistry } from "../registry";
import type { ShaderDefinition } from "../types";

/**
 * Infrastructure-ready placeholder — lowest priority, genuinely optional
 * (docs/13_SHADER_ARCHITECTURE.md: "heat-shimmer-style UV distortion near
 * actively-rising steam"). A *complete* screen-space distortion effect
 * needs to sample a background render target, which is Effect Manager /
 * EffectComposer territory (a custom pass), not something a single
 * material can do alone — out of scope for a Shader Manager sprint. What's
 * built and real here is the noise-based offset *computation* (proven to
 * compile via `DevDiagnosticsProbe.tsx`), visualized directly as a soft
 * shimmer pattern rather than wired into a render-target sampling pass
 * that doesn't exist yet.
 */
const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uStrength;
varying vec2 vUv;

${noise2DGLSL}

void main() {
  vec2 offset = vec2(
    noise2D(vUv * 8.0 + vec2(uTime * 0.6, 0.0)),
    noise2D(vUv * 8.0 + vec2(0.0, uTime * 0.6))
  ) - 0.5;
  float shimmer = length(offset) * uStrength;
  gl_FragColor = vec4(vec3(1.0), shimmer);
}
`;

export function createDistortionMaterial(uniformOverrides?: Record<string, THREE.IUniform>): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      ...createPerInstanceUniforms(),
      uStrength: { value: 0.3 },
      ...uniformOverrides,
    },
    transparent: true,
    depthWrite: false,
  });
}

shaderRegistry.register({
  name: "distortion",
  version: 1,
  path: "unlit",
  create: createDistortionMaterial,
} satisfies ShaderDefinition);
