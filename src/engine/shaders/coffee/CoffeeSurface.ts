import * as THREE from "three";

import { shaderRegistry } from "../registry";
import { injectFresnelRim } from "../surfaces/applyFresnelRim";
import type { ShaderDefinition } from "../types";
import { captureLiquidShaderRef, injectLiquidDeformation } from "./liquidDeformation";

export { updateLiquidDeformationUniforms } from "./liquidDeformation";

/**
 * Sprint 2.4 built the fresnel rim (proving the physically-lit
 * `onBeforeCompile` path compiles and renders correctly). Sprint 3.4 adds
 * the liquid deformation (tilt + ripples) docs/13_SHADER_ARCHITECTURE.md
 * designed for this exact moment — "Coffee shader becomes the owner of
 * liquid deformation," the brief's own words. Both live inside *one*
 * combined `onBeforeCompile` callback (`injectFresnelRim`/
 * `injectLiquidDeformation` are the extracted, composable halves) — a
 * second, separate `material.onBeforeCompile = ...` assignment would
 * silently overwrite the first rather than adding to it.
 */
export function applyCoffeeSurface(material: THREE.Material): void {
  const physicallyLitMaterial = material as THREE.MeshPhysicalMaterial;
  physicallyLitMaterial.onBeforeCompile = (shader) => {
    injectFresnelRim(shader, { color: new THREE.Color(1, 0.85, 0.6), intensity: 0.04, power: 3 });
    injectLiquidDeformation(shader);
    captureLiquidShaderRef(physicallyLitMaterial, shader);
  };
  physicallyLitMaterial.needsUpdate = true;
}

const coffeeShaderDefinition: ShaderDefinition = {
  name: "coffee",
  version: 1,
  path: "physically-lit",
  apply: applyCoffeeSurface,
};

shaderRegistry.register(coffeeShaderDefinition);
