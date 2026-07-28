import * as THREE from "three";

import { createPerInstanceUniforms } from "../common/uniforms";
import { shaderRegistry } from "../registry";
import type { ShaderDefinition } from "../types";
import { steamFragmentShader } from "./steam.frag";
import { steamVertexShader } from "./steam.vert";

/**
 * Unlit path (docs/13_SHADER_ARCHITECTURE.md) — steam never needs to
 * physically respond to scene lighting. `uOpacity` is per-instance
 * alongside `uTime`, not in the shared block: each of the 3 billboard
 * planes `ProceduralSteam` renders has its own independently-computed
 * rise/fade curve (unchanged from the Milestone 1 JS animation loop) — a
 * shared opacity would make all 3 plane fade in lockstep, the same
 * "organic vs. mechanical" failure mode `uTime` already avoids.
 */
export function createSteamMaterial(uniformOverrides?: Record<string, THREE.IUniform>): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: steamVertexShader,
    fragmentShader: steamFragmentShader,
    uniforms: {
      ...createPerInstanceUniforms(),
      uOpacity: { value: 0 },
      ...uniformOverrides,
    },
    transparent: true,
    depthWrite: false,
  });
}

const steamShaderDefinition: ShaderDefinition = {
  name: "steam",
  version: 1,
  path: "unlit",
  create: createSteamMaterial,
};

shaderRegistry.register(steamShaderDefinition);
