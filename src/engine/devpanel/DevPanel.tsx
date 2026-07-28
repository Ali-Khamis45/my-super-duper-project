"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

import { performanceManager } from "@/engine/performance";
import { latestSnapshot } from "@/engine/performance/runtimeProfiler";
import { createBridgeStore } from "@/engine/state/createBridgeStore";
import { useUIStore } from "@/stores/ui-store";

/**
 * Purely informational (which camera preset is active) — real performance
 * *measurements* now live in `engine/performance/runtimeProfiler.ts`'s
 * `latestSnapshot`, produced by the always-on `PerformanceSampler`
 * (Sprint 2.5), not sampled a second time here. Keeping "what's being
 * rendered" and "how well it's rendering" as two separate, small stores
 * rather than one bag of unrelated fields.
 */
const currentPreset = createBridgeStore("-");

interface DevPanelStatsCollectorProps {
  /** A generic label (a camera preset name, a route name, ...) — this collector doesn't care what it means. */
  preset: string;
}

/** Dev-only (gated at the call site) — records which preset is active for the overlay's display. The real sampling loop is `PerformanceSampler`, mounted unconditionally. */
export function DevPanelStatsCollector({ preset }: DevPanelStatsCollectorProps) {
  useEffect(() => {
    currentPreset.setValue(preset);
  }, [preset]);

  return null;
}

/**
 * Extension point for a future material/lighting live-tweak panel
 * (docs/22_MANAGER_INTERFACES.md `IDebugManager.registerPanel`) — the
 * registry exists and DevPanel renders whatever's registered; no concrete
 * panel is registered yet (library choice explicitly deferred, see
 * docs/26_API_STABILITY.md).
 */
const registeredPanels = new Map<string, () => ReactNode>();

export function registerDevPanel(name: string, render: () => ReactNode): void {
  registeredPanels.set(name, render);
}

/**
 * Dev-only DOM overlay; never rendered in production. Hidden until toggled
 * with the backtick/grave key (a common "toggle debug HUD" convention,
 * unlikely to collide with page shortcuts) — self-contained so mounting
 * `<DevPanel />` is the only wiring a page needs.
 */
export function DevPanel() {
  const devPanelOpen = useUIStore((state) => state.devPanelOpen);
  const toggleDevPanel = useUIStore((state) => state.toggleDevPanel);
  const snapshot = latestSnapshot.useValue();
  const tier = performanceManager.tier.useValue();
  const mode = performanceManager.mode.useValue();
  const preset = currentPreset.useValue();

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "`") toggleDevPanel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleDevPanel]);

  if (process.env.NODE_ENV === "production" || !devPanelOpen) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 rounded-md bg-black/80 px-3 py-2 font-mono text-xs text-white">
      <p>
        {snapshot?.fps ?? 0} fps · {(snapshot?.frameTimeMs ?? 0).toFixed(1)} ms/frame
      </p>
      <p>
        {snapshot?.drawCalls ?? 0} calls · {snapshot?.triangles ?? 0} tris · {snapshot?.geometries ?? 0} geo
      </p>
      <p>
        camera: {preset} · tier: {tier} ({mode})
      </p>
      {Array.from(registeredPanels.entries()).map(([name, render]) => (
        <div key={name}>{render()}</div>
      ))}
      <p className="text-white/50">` to close</p>
    </div>
  );
}
