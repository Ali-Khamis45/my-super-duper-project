import * as THREE from "three";

import { appEvents } from "@/engine/events";

import { createSyncCache } from "./createSyncCache";
import { SURFACE_PRESETS } from "./presets";
import type { MaterialCacheKey, MaterialSurface, SurfaceParams } from "./types";

/** The frozen contract's serialization form (docs/22_MANAGER_INTERFACES.md `IMaterialManager`) — stable, round-trippable, used as the cache's internal key. */
export function materialCacheKeyToString(key: MaterialCacheKey): string {
  return `${key.surface}:${key.colorHex}${key.variant ? `:${key.variant}` : ""}`;
}

/**
 * Validation + fallback (Surface Contracts): out-of-range PBR values would
 * otherwise reach Three.js silently and render wrong (e.g. `roughness: 2`
 * doesn't error, it just looks wrong). Invalid fields fall back to the
 * surface's own preset default rather than propagating garbage.
 */
export function validateSurfaceParams(surface: MaterialSurface, params: Partial<SurfaceParams>): SurfaceParams {
  const preset = SURFACE_PRESETS[surface];
  const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

  function resolve(field: keyof SurfaceParams): number | undefined {
    const value = params[field];
    if (value === undefined) return preset[field];
    if (typeof value !== "number" || Number.isNaN(value)) return preset[field];
    return field === "metalness" || field === "roughness" ? clamp01(value) : Math.max(0, value);
  }

  return {
    roughness: resolve("roughness")!,
    metalness: resolve("metalness")!,
    clearcoat: resolve("clearcoat"),
    clearcoatRoughness: resolve("clearcoatRoughness"),
    transmission: resolve("transmission"),
    envMapIntensity: resolve("envMapIntensity"),
  };
}

/**
 * Memory Budget Integration, same count-based-proxy caveat as
 * docs/reviews/sprint-2.2-review.md's asset caches: 32 compiled materials
 * comfortably covers every surface x colorway x variant combination a
 * customizer session (Milestone 4) would realistically produce in one
 * sitting, without an unbounded GPU-resident material count.
 */
const materialCache = createSyncCache<THREE.Material>({
  maxEntries: 32,
  onCreated: (key) => appEvents.emit({ name: "material:created", key }),
  onEvicted: (key, value) => {
    value.dispose();
    appEvents.emit({ name: "material:disposed", key });
  },
});

export function getOrCreateMaterial(key: MaterialCacheKey, factory: () => THREE.Material): THREE.Material {
  return materialCache.getOrCreate(materialCacheKeyToString(key), factory);
}

/** Dynamic Material Updates: mutates an existing material in place — no disposal, no new GPU upload, no identity change for the consumer holding the reference. */
export function updateMaterialParams(material: THREE.MeshPhysicalMaterial, surface: MaterialSurface, overrides: Partial<SurfaceParams>): void {
  const params = validateSurfaceParams(surface, overrides);
  material.roughness = params.roughness;
  material.metalness = params.metalness;
  if (params.clearcoat !== undefined) material.clearcoat = params.clearcoat;
  if (params.clearcoatRoughness !== undefined) material.clearcoatRoughness = params.clearcoatRoughness;
  if (params.transmission !== undefined) material.transmission = params.transmission;
  if (params.envMapIntensity !== undefined) material.envMapIntensity = params.envMapIntensity;
  material.needsUpdate = true;
  appEvents.emit({ name: "material:updated", key: materialCacheKeyToString({ surface, colorHex: `#${material.color.getHexString()}` }) });
}

export function updateMaterialColor(material: THREE.MeshPhysicalMaterial, color: THREE.Color): void {
  material.color.set(color);
}

export function disposeMaterialCacheEntry(key: MaterialCacheKey): void {
  materialCache.invalidate(materialCacheKeyToString(key), (material) => material.dispose());
  appEvents.emit({ name: "material:disposed", key: materialCacheKeyToString(key) });
}

export function clearMaterialCache(): void {
  materialCache.clear((material) => material.dispose());
}

/** Performance review: material reuse / cache efficiency, measured directly rather than assumed. */
export function getMaterialCacheStats() {
  return { hits: materialCache.hits, misses: materialCache.misses };
}
