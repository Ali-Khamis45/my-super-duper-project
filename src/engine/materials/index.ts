export {
  createCeramicMaterial,
  createFoamMaterial,
  createGlassMaterial,
  createIngredientMaterial,
  createLidMaterial,
  createLiquidMaterial,
  createMetalMaterial,
  createSleeveMaterial,
  createSurfaceMaterial,
} from "./MaterialFactory";
export {
  clearMaterialCache,
  disposeMaterialCacheEntry,
  getMaterialCacheStats,
  getOrCreateMaterial,
  materialCacheKeyToString,
  updateMaterialColor,
  updateMaterialParams,
  validateSurfaceParams,
} from "./cache";
export { SURFACE_PRESETS } from "./presets";
export { notifyThemeMaterialsUpdated, resolveEnvMapIntensity, resolveMaterialContext } from "./themeBridge";
export type { MaterialCacheKey, MaterialContext, MaterialSurface, SurfaceParams } from "./types";
