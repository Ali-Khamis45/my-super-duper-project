import { appEvents } from "@/engine/events";

/**
 * Memory Pressure Detection — the same honest, indirect approach used
 * everywhere else in this project (no reliable cross-browser memory-usage
 * API exists; documented since docs/15_ARCHITECTURE_FREEZE.md's failure-
 * mode table). Two *already real* signals, combined: `resource:evicted`
 * (Sprint 2.2/2.3's cache-pressure-specific event — deliberately not
 * `asset:disposed`/`material:disposed`, which also fire for ordinary,
 * non-pressure disposal) and a sustained low-FPS streak
 * (`performance:degraded`, this sprint). Either alone is a weak signal —
 * a burst of evictions during a fast customizer session with fine FPS
 * isn't memory pressure, and one slow frame isn't either. Both together,
 * within the same window, is a real, if still imperfect, proxy.
 */
const EVICTION_WINDOW_MS = 10_000;
const EVICTION_RATE_THRESHOLD = 5;

let evictionTimestamps: number[] = [];
let isPerformanceDegraded = false;
let alreadyReported = false;
let unsubscribeFns: Array<() => void> = [];

function pruneOldEvictions(now: number): void {
  evictionTimestamps = evictionTimestamps.filter((timestamp) => now - timestamp < EVICTION_WINDOW_MS);
}

function evaluate(): void {
  if (!isPerformanceDegraded) return;
  const now = performance.now();
  pruneOldEvictions(now);

  if (evictionTimestamps.length >= EVICTION_RATE_THRESHOLD && !alreadyReported) {
    alreadyReported = true;
    appEvents.emit({
      name: "memory:pressure",
      reason: `${evictionTimestamps.length} cache evictions within ${EVICTION_WINDOW_MS}ms alongside a sustained low-FPS streak`,
    });
  }
}

export function initMemoryPressureDetection(): () => void {
  const unsubEviction = appEvents.on("resource:evicted", () => {
    evictionTimestamps.push(performance.now());
    evaluate();
  });
  const unsubDegraded = appEvents.on("performance:degraded", () => {
    isPerformanceDegraded = true;
    evaluate();
  });
  const unsubRecovered = appEvents.on("performance:recovered", () => {
    isPerformanceDegraded = false;
    alreadyReported = false;
  });

  unsubscribeFns = [unsubEviction, unsubDegraded, unsubRecovered];
  return () => {
    for (const unsubscribe of unsubscribeFns) unsubscribe();
  };
}

/** Test-only reset — mirrors `resetGpuBudgetState`'s purpose for `gpuBudget.ts`. */
export function resetMemoryPressureState(): void {
  evictionTimestamps = [];
  isPerformanceDegraded = false;
  alreadyReported = false;
}
