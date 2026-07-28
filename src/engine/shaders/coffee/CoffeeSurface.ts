import * as THREE from "three";

import { shaderRegistry } from "../registry";
import { applyFresnelRim } from "../surfaces/applyFresnelRim";
import type { ShaderDefinition } from "../types";

/**
 * Infrastructure-ready placeholder (docs/16_ENGINEERING_SPRINTS.md Sprint
 * 2.4) — a subtle fresnel rim on the coffee surface, proving the
 * physically-lit `onBeforeCompile` path compiles and renders correctly.
 * Explicitly NOT the final coffee liquid physics (tilt, ripples) —
 * docs/13_SHADER_ARCHITECTURE.md's Milestone 3 design — this sprint's
 * brief excludes that by name ("Do not build: Final Coffee Physics").
 */
export function applyCoffeeSurface(material: THREE.Material): void {
  applyFresnelRim(material as THREE.MeshPhysicalMaterial, {
    color: new THREE.Color(1, 0.85, 0.6),
    intensity: 0.04,
    power: 3,
  });
}

const coffeeShaderDefinition: ShaderDefinition = {
  name: "coffee",
  version: 1,
  path: "physically-lit",
  apply: applyCoffeeSurface,
};

shaderRegistry.register(coffeeShaderDefinition);
