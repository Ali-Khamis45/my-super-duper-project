import * as THREE from "three";

import { SURFACE_PRESETS } from "./presets";
import type { MaterialSurface, SurfaceParams } from "./types";

/**
 * Tuned PBR material factories, one per surface *type* — not per cup part,
 * so a future product-detail scene reuses these instead of re-deriving
 * material params. Moved here from `engine/graphics/MaterialFactory.ts`
 * during Sprint 2.3 (mechanical relocation, zero behavior change) so the
 * whole Material & Surface Platform lives in one module, matching the
 * Sprint 2.1 precedent (Environment/Lighting split out of `engine/graphics/`
 * the same way).
 */
function buildMaterial(surface: MaterialSurface, color: THREE.Color, overrides?: Partial<SurfaceParams>) {
  const params = { ...SURFACE_PRESETS[surface], ...overrides };
  // THREE.Material.setValues() warns ("parameter 'x' has value of
  // undefined") for any key present with an undefined value — a preset
  // that doesn't define e.g. `clearcoat` must omit the key entirely, not
  // pass `clearcoat: undefined`. Found via a real console warning during
  // this sprint's visual verification, fixed here rather than ignored.
  const materialParams: THREE.MeshPhysicalMaterialParameters = { color, roughness: params.roughness, metalness: params.metalness };
  if (params.clearcoat !== undefined) materialParams.clearcoat = params.clearcoat;
  if (params.clearcoatRoughness !== undefined) materialParams.clearcoatRoughness = params.clearcoatRoughness;
  if (params.transmission !== undefined) materialParams.transmission = params.transmission;
  if (params.envMapIntensity !== undefined) materialParams.envMapIntensity = params.envMapIntensity;
  return new THREE.MeshPhysicalMaterial(materialParams);
}

export function createCeramicMaterial(color: THREE.Color, overrides?: Partial<SurfaceParams>) {
  return buildMaterial("ceramic", color, overrides);
}

export function createLiquidMaterial(color: THREE.Color, overrides?: Partial<SurfaceParams>) {
  return buildMaterial("liquid", color, overrides);
}

export function createFoamMaterial(color: THREE.Color, overrides?: Partial<SurfaceParams>) {
  return buildMaterial("foam", color, overrides);
}

export function createSleeveMaterial(color: THREE.Color, overrides?: Partial<SurfaceParams>) {
  return buildMaterial("sleeve", color, overrides);
}

export function createLidMaterial(color: THREE.Color, overrides?: Partial<SurfaceParams>) {
  return buildMaterial("lid", color, overrides);
}

/** No current consumer — see docs/engine/materials/types.ts's note on why this is built anyway. */
export function createGlassMaterial(color: THREE.Color, overrides?: Partial<SurfaceParams>) {
  return buildMaterial("glass", color, overrides);
}

/** No current consumer — see docs/engine/materials/types.ts's note on why this is built anyway. */
export function createMetalMaterial(color: THREE.Color, overrides?: Partial<SurfaceParams>) {
  return buildMaterial("metal", color, overrides);
}

const SURFACE_FACTORIES: Record<MaterialSurface, typeof createCeramicMaterial> = {
  ceramic: createCeramicMaterial,
  liquid: createLiquidMaterial,
  foam: createFoamMaterial,
  sleeve: createSleeveMaterial,
  lid: createLidMaterial,
  glass: createGlassMaterial,
  metal: createMetalMaterial,
};

export function createSurfaceMaterial(surface: MaterialSurface, color: THREE.Color, overrides?: Partial<SurfaceParams>) {
  return SURFACE_FACTORIES[surface](color, overrides);
}
