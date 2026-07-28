import * as THREE from "three";

import { createPerInstanceUniforms } from "../common/uniforms";
import { shaderRegistry } from "../registry";
import type { ShaderDefinition } from "../types";

/**
 * Infrastructure-ready placeholder for the Milestone 5 Ingredient System
 * (docs/13_SHADER_ARCHITECTURE.md: "likely `InstancedMesh` with per-instance
 * attributes... driven by a lightweight vertex shader reading instance
 * attributes rather than N individually-animated meshes"). A soft circular
 * falloff per particle — the same radial-falloff technique as steam, reused
 * rather than reinvented, since both are "a soft round sprite," just with
 * different per-instance driving data. No scene consumer yet — no
 * ingredient exists to instantiate this for — verified compiling via
 * `DevDiagnosticsProbe.tsx`.
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
uniform vec3 uParticleColor;
varying vec2 vUv;

void main() {
  float dist = length(vUv - 0.5);
  float falloff = smoothstep(0.5, 0.0, dist);
  float twinkle = 0.7 + 0.3 * sin(uTime * 4.0);
  gl_FragColor = vec4(uParticleColor, falloff * twinkle);
}
`;

export function createParticleMaterial(uniformOverrides?: Record<string, THREE.IUniform>): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      ...createPerInstanceUniforms(),
      uParticleColor: { value: new THREE.Color(1, 1, 1) },
      ...uniformOverrides,
    },
    transparent: true,
    depthWrite: false,
  });
}

shaderRegistry.register({
  name: "particles",
  version: 1,
  path: "unlit",
  create: createParticleMaterial,
} satisfies ShaderDefinition);
