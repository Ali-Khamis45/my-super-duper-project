import * as THREE from "three";

import { shaderRegistry } from "../registry";
import { applyFresnelRim } from "../surfaces/applyFresnelRim";
import type { ShaderDefinition } from "../types";

/**
 * Infrastructure-ready placeholder — foam's micro-bubble structure catches
 * light at grazing angles more than a smooth surface would
 * (docs/13_SHADER_ARCHITECTURE.md); a fresnel rim is a cheap approximation
 * of that, not true subsurface scattering. Explicitly NOT the live-
 * animated noise displacement docs/13_SHADER_ARCHITECTURE.md designs for
 * Milestone 2's full foam pass — this sprint's brief excludes that
 * ("intentionally simple" placeholders only). Shares `applyFresnelRim`
 * with coffee — "one shared onBeforeCompile convention, not two different
 * techniques for two similar surfaces," per the same design doc.
 */
export function applyFoamSurface(material: THREE.Material): void {
  applyFresnelRim(material as THREE.MeshPhysicalMaterial, {
    color: new THREE.Color(1, 1, 1),
    intensity: 0.08,
    power: 2,
  });
}

const foamShaderDefinition: ShaderDefinition = {
  name: "foam",
  version: 1,
  path: "physically-lit",
  apply: applyFoamSurface,
};

shaderRegistry.register(foamShaderDefinition);
