import * as THREE from "three";

import { toneMappingGLSL } from "../common/toneMapping";
import { createPerInstanceUniforms } from "../common/uniforms";
import { shaderRegistry } from "../registry";
import type { ShaderDefinition } from "../types";

/**
 * Infrastructure-ready placeholder — a targeted, per-object glow, distinct
 * from Bloom's global screen-space threshold (docs/13_SHADER_ARCHITECTURE.md's
 * "Glow vs. Bloom" section). No scene consumer yet — nothing currently
 * needs a per-object emphasis glow — verified compiling for real via
 * `DevDiagnosticsProbe.tsx`, not a production render. Self-tonemaps
 * (`reinhardToneMap`) before additive output so it doesn't blow out when
 * stacked with the renderer's own ACES pass on Bloom.
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
uniform vec3 uGlowColor;
uniform float uIntensity;
varying vec2 vUv;

${toneMappingGLSL}

void main() {
  float dist = length(vUv - 0.5);
  float falloff = smoothstep(0.5, 0.0, dist);
  float pulse = 0.85 + 0.15 * sin(uTime * 1.5);
  vec3 glow = reinhardToneMap(uGlowColor * falloff * uIntensity * pulse);
  gl_FragColor = vec4(glow, falloff);
}
`;

export function createGlowMaterial(uniformOverrides?: Record<string, THREE.IUniform>): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      ...createPerInstanceUniforms(),
      uGlowColor: { value: new THREE.Color(1, 1, 1) },
      uIntensity: { value: 1 },
      ...uniformOverrides,
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

shaderRegistry.register({
  name: "glow",
  version: 1,
  path: "unlit",
  create: createGlowMaterial,
} satisfies ShaderDefinition);
