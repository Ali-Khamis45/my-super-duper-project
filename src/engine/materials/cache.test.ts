import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";

import { appEvents } from "@/engine/events";

import {
  clearMaterialCache,
  disposeMaterialCacheEntry,
  getMaterialCacheStats,
  getOrCreateMaterial,
  materialCacheKeyToString,
  updateMaterialColor,
  updateMaterialParams,
  validateSurfaceParams,
} from "./cache";

const white = new THREE.Color(1, 1, 1);

describe("materialCacheKeyToString", () => {
  it("serializes surface + colorHex, and includes variant only when present", () => {
    expect(materialCacheKeyToString({ surface: "ceramic", colorHex: "#fff" })).toBe("ceramic:#fff");
    expect(materialCacheKeyToString({ surface: "ceramic", colorHex: "#fff", variant: "night" })).toBe(
      "ceramic:#fff:night",
    );
  });
});

describe("validateSurfaceParams", () => {
  it("clamps out-of-range roughness/metalness into [0, 1]", () => {
    const params = validateSurfaceParams("ceramic", { roughness: 5, metalness: -3 });
    expect(params.roughness).toBe(1);
    expect(params.metalness).toBe(0);
  });

  it("falls back to the surface preset for a NaN or missing field", () => {
    const params = validateSurfaceParams("ceramic", { roughness: Number.NaN });
    expect(params.roughness).toBe(0.12); // ceramic preset default
  });

  it("a fully valid override passes through unchanged", () => {
    const params = validateSurfaceParams("lid", { roughness: 0.4, metalness: 0 });
    expect(params.roughness).toBe(0.4);
  });
});

describe("getOrCreateMaterial", () => {
  it("returns the same instance for the same key, calling the factory once", () => {
    const factory = vi.fn(() => new THREE.MeshPhysicalMaterial({ color: white }));
    const a = getOrCreateMaterial({ surface: "ceramic", colorHex: "#test-a" }, factory);
    const b = getOrCreateMaterial({ surface: "ceramic", colorHex: "#test-a" }, factory);
    expect(a).toBe(b);
    expect(factory).toHaveBeenCalledTimes(1);
    disposeMaterialCacheEntry({ surface: "ceramic", colorHex: "#test-a" });
  });

  it("emits material:created only on a real cache miss", () => {
    const listener = vi.fn();
    const unsub = appEvents.on("material:created", listener);
    const key = { surface: "ceramic" as const, colorHex: "#test-b" };
    getOrCreateMaterial(key, () => new THREE.MeshPhysicalMaterial());
    getOrCreateMaterial(key, () => new THREE.MeshPhysicalMaterial());
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
    disposeMaterialCacheEntry(key);
  });
});

describe("updateMaterialParams", () => {
  it("mutates an existing material in place rather than replacing it", () => {
    const material = new THREE.MeshPhysicalMaterial({ roughness: 0.9 });
    updateMaterialParams(material, "ceramic", { roughness: 0.2 });
    expect(material.roughness).toBe(0.2);
  });

  it("emits material:updated", () => {
    const listener = vi.fn();
    const unsub = appEvents.on("material:updated", listener);
    const material = new THREE.MeshPhysicalMaterial();
    updateMaterialParams(material, "ceramic", { roughness: 0.3 });
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
  });
});

describe("updateMaterialColor", () => {
  it("mutates the material's color in place", () => {
    const material = new THREE.MeshPhysicalMaterial({ color: white });
    const red = new THREE.Color(1, 0, 0);
    updateMaterialColor(material, red);
    expect(material.color.getHex()).toBe(red.getHex());
  });
});

describe("disposeMaterialCacheEntry", () => {
  it("disposes the material and removes it from the cache", () => {
    const key = { surface: "ceramic" as const, colorHex: "#test-c" };
    const material = getOrCreateMaterial(key, () => new THREE.MeshPhysicalMaterial()) as THREE.MeshPhysicalMaterial;
    const disposeSpy = vi.spyOn(material, "dispose");

    disposeMaterialCacheEntry(key);

    expect(disposeSpy).toHaveBeenCalled();
    // A subsequent request creates a fresh instance, not the disposed one.
    const factory = vi.fn(() => new THREE.MeshPhysicalMaterial());
    getOrCreateMaterial(key, factory);
    expect(factory).toHaveBeenCalledTimes(1);
  });
});

describe("clearMaterialCache and getMaterialCacheStats", () => {
  it("clear disposes every cached material", () => {
    const keyA = { surface: "ceramic" as const, colorHex: "#test-d" };
    const keyB = { surface: "sleeve" as const, colorHex: "#test-e" };
    const matA = getOrCreateMaterial(keyA, () => new THREE.MeshPhysicalMaterial()) as THREE.MeshPhysicalMaterial;
    const matB = getOrCreateMaterial(keyB, () => new THREE.MeshPhysicalMaterial()) as THREE.MeshPhysicalMaterial;
    const disposeA = vi.spyOn(matA, "dispose");
    const disposeB = vi.spyOn(matB, "dispose");

    clearMaterialCache();

    expect(disposeA).toHaveBeenCalled();
    expect(disposeB).toHaveBeenCalled();
  });

  it("reports hit/miss counts", () => {
    const key = { surface: "ceramic" as const, colorHex: "#test-f" };
    getOrCreateMaterial(key, () => new THREE.MeshPhysicalMaterial());
    getOrCreateMaterial(key, () => new THREE.MeshPhysicalMaterial());
    const stats = getMaterialCacheStats();
    expect(stats.hits).toBeGreaterThanOrEqual(1);
    expect(stats.misses).toBeGreaterThanOrEqual(1);
  });
});
