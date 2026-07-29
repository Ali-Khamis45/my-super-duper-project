import * as THREE from "three";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";

import { appEvents } from "@/engine/events";
import { performanceManager } from "@/engine/performance";
import { resolveAssetQualityOptions } from "@/engine/performance/assetQuality";
import type { ThemeName } from "@/engine/theme/ThemeEngine";

import { createResourceManager, type ResourceManager } from "./createResourceManager";
import { resolveAssetUrl } from "./manifest";

/**
 * The texture pipeline — one owner (this module) for every loaded
 * texture's loading/caching/disposal/recovery/eviction. KTX2/Basis
 * Universal for any real compressed texture, browser-native decode for
 * plain PNG/JPG/AVIF (no format-specific code needed — `<img>`/`Image()`
 * already sniffs and decodes AVIF in every evergreen browser, same as any
 * other raster format THREE.TextureLoader hands to it).
 */

let renderer: THREE.WebGLRenderer | null = null;
let ktx2Loader: KTX2Loader | null = null;
const textureLoader = new THREE.TextureLoader();

/** Called once, from the Canvas's `onCreated` — KTX2Loader needs a live renderer for transcoder-support detection, unavailable at module-load time. */
export function initTexturePipeline(gl: THREE.WebGLRenderer): void {
  renderer = gl;
}

function getKTX2Loader(): KTX2Loader {
  if (!renderer) {
    throw new Error("Texture pipeline not initialized — call initTexturePipeline(gl) before loading a .ktx2 texture.");
  }
  if (ktx2Loader) return ktx2Loader;

  const loader = new KTX2Loader();
  loader.setTranscoderPath("/basis/"); // self-hosted, not CDN — same policy as Draco, ADR-0009
  loader.detectSupport(renderer);
  ktx2Loader = loader;
  return loader;
}

function disposeTexture(texture: THREE.Texture): void {
  texture.dispose();
}

/**
 * Memory Budget Integration: `maxEntries` is a *count-based proxy* for
 * docs/14_PERFORMANCE_STRATEGY.md's < 64MB hero-scene texture-memory
 * budget, not a literal byte measurement — no reliable cross-browser API
 * exposes actual GPU-resident texture memory (an already-documented
 * limitation, see docs/15_ARCHITECTURE_FREEZE.md's failure-mode table).
 * Reasoned from the budget doc's own numbers: an uncompressed 2K RGBA8
 * texture is ~16.8MB; KTX2 compression is typically 4-8x smaller in VRAM,
 * so a real compressed texture lands well under 4MB — 24 entries stays
 * comfortably inside budget even in the pessimistic case.
 */
const textureCache: ResourceManager<THREE.Texture> = createResourceManager<THREE.Texture>({
  maxEntries: 24,
  onEvicted: (key) => appEvents.emit({ name: "resource:evicted", key }),
  onDisposed: (key, value) => {
    disposeTexture(value);
    appEvents.emit({ name: "asset:disposed", key });
  },
});

function fetchTexture(url: string): Promise<THREE.Texture> {
  if (url.endsWith(".ktx2")) {
    return getKTX2Loader().loadAsync(url);
  }
  return textureLoader.loadAsync(url);
}

/** A loaded texture with a zero-dimension image is corrupt/empty, not a texture worth caching or rendering. */
function validateTexture(texture: THREE.Texture): THREE.Texture {
  const image = texture.image as { width?: number; height?: number } | undefined;
  if (!image || !image.width || !image.height) {
    throw new Error("Loaded texture has no valid image data (0x0 or missing).");
  }
  return texture;
}

export interface LoadTextureOptions {
  colorSpace?: THREE.ColorSpace;
  anisotropy?: number;
  generateMipmaps?: boolean;
}

export type TextureLoadResult = { status: "loaded"; texture: THREE.Texture } | { status: "fallback"; reason: string };

export async function loadTexture(key: string, options: LoadTextureOptions = {}): Promise<TextureLoadResult> {
  const startTime = performance.now();
  appEvents.emit({ name: "asset:loading", key });

  try {
    const texture = await textureCache.load(key, async () => {
      const loaded = validateTexture(await fetchTexture(resolveAssetUrl(key)));
      loaded.colorSpace = options.colorSpace ?? THREE.SRGBColorSpace;
      loaded.generateMipmaps = options.generateMipmaps ?? true;
      const tierCap = resolveAssetQualityOptions(performanceManager.tier.getValue()).maxAnisotropy;
      const rendererMax = renderer?.capabilities.getMaxAnisotropy() ?? tierCap;
      loaded.anisotropy = options.anisotropy ?? Math.min(tierCap, rendererMax);
      loaded.needsUpdate = true;
      return loaded;
    });
    appEvents.emit({ name: "asset:loaded", key, durationMs: performance.now() - startTime });
    return { status: "loaded", texture };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    if (reason.includes("timed out")) {
      appEvents.emit({ name: "asset:timeout", key, elapsedMs: performance.now() - startTime });
    } else {
      appEvents.emit({ name: "asset:load-failed", key, reason });
    }
    return { status: "fallback", reason };
  }
}

/** A theme-scoped variant of the same logical texture caches independently — e.g. a light/dark sleeve pattern. */
export function themedAssetKey(baseKey: string, theme: ThemeName): string {
  return `${baseKey}--${theme}`;
}

export function preloadTexture(key: string): void {
  appEvents.emit({ name: "asset:loading", key });
  textureCache.preload(key, async () => validateTexture(await fetchTexture(resolveAssetUrl(key))));
}

export function disposeTextureAsset(key: string): void {
  textureCache.dispose(key, disposeTexture);
}

export function getTextureState(key: string) {
  return textureCache.get(key);
}

/** Engine Health Dashboard reading (Sprint 2.6) — this cache's live size/hit-rate, not duplicated bookkeeping. */
export function getTextureCacheStats(): { size: number; hits: number; misses: number } {
  return { size: textureCache.size, hits: textureCache.hits, misses: textureCache.misses };
}
