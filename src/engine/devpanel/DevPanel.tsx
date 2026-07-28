"use client";

import { useFrame, useThree } from "@react-three/fiber";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

import { performanceManager } from "@/engine/performance";
import { createBridgeStore } from "@/engine/state/createBridgeStore";
import { useUIStore } from "@/stores/ui-store";

interface DevStats {
  fps: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  preset: string;
}

const devStats = createBridgeStore<DevStats>({
  fps: 0,
  drawCalls: 0,
  triangles: 0,
  geometries: 0,
  preset: "-",
});

interface DevPanelStatsCollectorProps {
  /** A generic label (a camera preset name, a route name, ...) — this collector doesn't care what it means. */
  preset: string;
}

/**
 * Renders nothing — samples `gl.info` and FPS every ~500ms from inside the
 * Canvas and writes to a dedicated bridge store so the DOM overlay
 * (DevPanel, outside the Canvas) doesn't need to re-render every frame.
 * Also feeds the Performance Manager's foundation sampler (docs/22_MANAGER_INTERFACES.md).
 * GPU/memory/particle-count are documented future additions — no reliable
 * standard web API for those exists yet.
 */
export function DevPanelStatsCollector({ preset }: DevPanelStatsCollectorProps) {
  const { gl } = useThree();
  const lastSampleTime = useRef(performance.now());
  const framesSinceSample = useRef(0);

  // Deliberately `useFrame`, not a raw `requestAnimationFrame` loop — under
  // frameloop="demand" (reduced motion), R3F only calls useFrame when it
  // actually renders a frame, so this correctly reflects R3F's real render
  // rate (including sparse demand-mode rendering) rather than the OS's
  // unconditional animation-frame rate.
  useFrame(() => {
    framesSinceSample.current += 1;
    const now = performance.now();
    const elapsed = now - lastSampleTime.current;
    if (elapsed >= 500) {
      const fps = Math.round((framesSinceSample.current * 1000) / elapsed);
      devStats.setValue({
        fps,
        drawCalls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries,
        preset,
      });
      performanceManager.sampleFrame(fps);
      framesSinceSample.current = 0;
      lastSampleTime.current = now;
    }
  });

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
  const stats = devStats.useValue();
  const tier = performanceManager.tier.useValue();

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
      <p>{stats.fps} fps</p>
      <p>
        {stats.drawCalls} calls · {stats.triangles} tris · {stats.geometries} geo
      </p>
      <p>
        camera: {stats.preset} · tier: {tier}
      </p>
      {Array.from(registeredPanels.entries()).map(([name, render]) => (
        <div key={name}>{render()}</div>
      ))}
      <p className="text-white/50">` to close</p>
    </div>
  );
}
