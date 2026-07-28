import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

import { appEvents } from "@/engine/events";

import { createResourceManager, type ResourceManager } from "./createResourceManager";
import { getGLTFLoader } from "./gltfLoader";
import { resolveAssetUrl } from "./manifest";

/**
 * The GLB pipeline — one owner (this module) for every loaded GLTF's
 * loading/caching/disposal/recovery/eviction, per Sprint 2.2's ownership
 * rule. Built on the generic `createResourceManager`, not a bespoke cache.
 */
function disposeGLTF(gltf: GLTF): void {
  gltf.scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => material.dispose());
  });
}

/**
 * Memory Budget Integration: `maxEntries` is a count-based proxy for
 * docs/14_PERFORMANCE_STRATEGY.md's < 256MB total GPU-memory budget, same
 * caveat as the texture cache's cap — no reliable byte-level API exists.
 * Set lower than the texture cache's 24: a hero-scale GLB (up to the
 * documented 50k-triangle budget) is a much heavier single resource than
 * one texture, so far fewer can coexist in flight at once.
 */
const glbCache: ResourceManager<GLTF> = createResourceManager<GLTF>({
  maxEntries: 8,
  onEvicted: (key) => appEvents.emit({ name: "resource:evicted", key }),
  onDisposed: (key, value) => {
    disposeGLTF(value);
    appEvents.emit({ name: "asset:disposed", key });
  },
});

function fetchGLTF(url: string): Promise<GLTF> {
  return new Promise((resolve, reject) => {
    getGLTFLoader().load(
      url,
      resolve,
      undefined,
      (error) => reject(error instanceof Error ? error : new Error(String(error))),
    );
  });
}

export type ModelLoadResult = { status: "loaded"; gltf: GLTF } | { status: "fallback"; reason: string };

/**
 * The mesh-swap contract's runtime half (docs/3d-asset-pipeline.md): never
 * throws to the caller. A failure or timeout resolves to `{ status:
 * "fallback" }` — the registry renders the `procedural` implementation
 * instead, exactly as `resolveCupPart` already does when only `procedural`
 * is registered. No `ModelCup`/etc. component exists yet to call this (zero
 * real GLBs in the repo) — this is the machinery, proven against injectable
 * loaders in tests, not a shipped asset.
 */
export async function loadModel(key: string): Promise<ModelLoadResult> {
  const startTime = performance.now();
  appEvents.emit({ name: "asset:loading", key });

  try {
    const gltf = await glbCache.load(key, () => fetchGLTF(resolveAssetUrl(key)));
    appEvents.emit({ name: "asset:loaded", key, durationMs: performance.now() - startTime });
    return { status: "loaded", gltf };
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

/** Streaming primitive — fire-and-forget, for above-the-fold assets requested before the component that needs them renders. */
export function preloadModel(key: string): void {
  appEvents.emit({ name: "asset:loading", key });
  glbCache.preload(key, () => fetchGLTF(resolveAssetUrl(key)));
}

export function disposeModel(key: string): void {
  glbCache.dispose(key, disposeGLTF);
}

export function getModelState(key: string) {
  return glbCache.get(key);
}
