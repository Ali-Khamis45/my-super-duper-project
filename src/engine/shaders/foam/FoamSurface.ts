import * as THREE from "three";

import { shaderRegistry } from "../registry";
import { injectFresnelRim } from "../surfaces/applyFresnelRim";
import type { ShaderDefinition } from "../types";
import { captureFoamShaderRef, injectFoamLagDeformation } from "./foamLagDeformation";

export { updateFoamLagUniforms } from "./foamLagDeformation";

/**
 * Sprint 2.4: a fresnel rim — foam's micro-bubble structure catches light
 * at grazing angles more than a smooth surface would
 * (docs/13_SHADER_ARCHITECTURE.md); a cheap approximation, not true
 * subsurface scattering. Sprint 3.4 adds the live-animated secondary-motion
 * displacement that doc always designed for this foam pass — "Foam shader
 * extends existing foam material," the brief's own words — composed into
 * the same single `onBeforeCompile` callback as the fresnel rim, same
 * composition reasoning as `CoffeeSurface.ts`.
 */
export function applyFoamSurface(material: THREE.Material): void {
  const physicallyLitMaterial = material as THREE.MeshPhysicalMaterial;
  physicallyLitMaterial.onBeforeCompile = (shader) => {
    injectFresnelRim(shader, { color: new THREE.Color(1, 1, 1), intensity: 0.08, power: 2 });
    injectFoamLagDeformation(shader);
    captureFoamShaderRef(physicallyLitMaterial, shader);
  };
  physicallyLitMaterial.needsUpdate = true;
}

const foamShaderDefinition: ShaderDefinition = {
  name: "foam",
  version: 1,
  path: "physically-lit",
  apply: applyFoamSurface,
};

shaderRegistry.register(foamShaderDefinition);
