"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";

import { evaluateAdaptiveQuality } from "./adaptiveQuality";
import { checkGpuBudget } from "./gpuBudget";
import { performanceManager } from "./index";
import { initMemoryPressureDetection } from "./memoryPressure";
import { recordPerformanceSnapshot } from "./runtimeProfiler";

/**
 * The real production sampler — deliberately **not** gated behind
 * `NODE_ENV !== "production"`, unlike `DevPanelStatsCollector`'s visible
 * DOM overlay. This distinction has been documented since Sprint 2.1/
 * docs/14_PERFORMANCE_STRATEGY.md: "the *visible* dev panel overlay is
 * correctly dev-only... The *underlying FPS sampling* that adaptive
 * quality reads from is not the same thing and must run in production —
 * a session on a struggling device is exactly the session adaptive
 * quality exists to protect, and that's always a production session."
 * Sprint 2.1 built the foundation without a real sampler feeding it in
 * production; this sprint closes that gap for real.
 *
 * Mounted once, unconditionally, in `CupScene`. Feeds every Sprint 2.5
 * system from one `gl.info` sample per ~500ms tick — one producer, many
 * consumers, matching "every runtime metric has exactly one producer."
 */
export function PerformanceSampler() {
  const { gl } = useThree();
  // Lazily initialized on the first `useFrame` tick, not here — calling
  // `performance.now()` as a `useRef` initial value would call an impure
  // function during render itself.
  const lastSampleTime = useRef<number | null>(null);
  const framesSinceSample = useRef(0);

  useEffect(() => {
    return initMemoryPressureDetection();
  }, []);

  // Deliberately `useFrame`, not a raw `requestAnimationFrame` loop — under
  // frameloop="demand" (reduced motion), R3F only calls useFrame when it
  // actually renders a frame, so this correctly reflects R3F's real render
  // rate rather than the OS's unconditional animation-frame rate.
  useFrame(() => {
    if (lastSampleTime.current === null) {
      lastSampleTime.current = performance.now();
      return;
    }
    framesSinceSample.current += 1;
    const now = performance.now();
    const elapsed = now - lastSampleTime.current;
    if (elapsed >= 500) {
      const fps = Math.round((framesSinceSample.current * 1000) / elapsed);
      const snapshot = recordPerformanceSnapshot({
        fps,
        drawCalls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries,
        gpuTextures: gl.info.memory.textures,
      });
      performanceManager.sampleFrame(fps);
      evaluateAdaptiveQuality(fps);
      checkGpuBudget(snapshot);
      framesSinceSample.current = 0;
      lastSampleTime.current = now;
    }
  });

  return null;
}
