"use client";

import { useEffect } from "react";

import { computeEngineHealth } from "./engineHealth";
import { registerDevPanel } from "./DevPanel";

/** Same self-gating convention as `DevPanel` itself — a mount-site `NODE_ENV` check would work too, but self-gating means one fewer thing a call site can get wrong. */
function renderEngineHealthPanel() {
  const health = computeEngineHealth();
  return (
    <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 border-t border-white/20 pt-1">
      <span>textures {health.textureCount}</span>
      <span>materials {health.materialCount}</span>
      <span>models {health.modelCount}</span>
      <span>
        shaders {health.compiledShaders}/{health.registeredShaders}
      </span>
      <span>gpu tex {health.gpuTextures}</span>
      <span>
        cache {(health.cacheHitRatio * 100).toFixed(0)}% ({health.cacheHits}/{health.cacheHits + health.cacheMisses})
      </span>
      <span>events/s {health.eventsPerSecond.toFixed(1)}</span>
    </div>
  );
}

/**
 * Registers the Engine Health Dashboard's data as a `DevPanel` sub-panel
 * (Sprint 2.6) — the same `registerDevPanel` extension point Sprint 2.4's
 * shader diagnostics probe was its first real consumer of. Dev-only,
 * mirroring `DevPanel`'s own self-gate rather than requiring the mount
 * site (`Hero.tsx`) to remember to gate it.
 */
export function EngineHealthPanel(): null {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    registerDevPanel("engine-health", renderEngineHealthPanel);
  }, []);

  return null;
}
