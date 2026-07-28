import { appEvents } from "@/engine/events";

import type { PerformanceSnapshot } from "./runtimeProfiler";

/**
 * GPU Budget Manager — checks a `PerformanceSnapshot` against
 * docs/14_PERFORMANCE_STRATEGY.md's already-decided budgets. Draw calls is
 * the primary check, per that doc's own emphasis ("Mobile GPU bottlenecks
 * are frequently CPU-side draw-call submission overhead... this ceiling
 * matters more than triangle count"); triangle count is a secondary,
 * scene-wide approximation of the doc's *per-object* budgets (hero <50k,
 * secondary <500 each) — a true per-object breakdown isn't available from
 * `gl.info`, which only reports scene totals.
 */
const DRAW_CALL_BUDGET = 100;
const TRIANGLE_BUDGET = 55_000; // hero object's 50k budget + headroom for secondary objects

let drawCallsOverBudget = false;
let trianglesOverBudget = false;

function warn(metric: string, value: number, budget: number): void {
  appEvents.emit({ name: "gpu:budget-warning", metric, value, budget });
}

/** Resets the crossing-detection state — useful when a new scene/route starts a fresh session, and in tests. */
export function resetGpuBudgetState(): void {
  drawCallsOverBudget = false;
  trianglesOverBudget = false;
}

/** Emits once per crossing into over-budget, not on every sample while it stays over budget. */
export function checkGpuBudget(snapshot: PerformanceSnapshot): void {
  if (snapshot.drawCalls > DRAW_CALL_BUDGET) {
    if (!drawCallsOverBudget) warn("drawCalls", snapshot.drawCalls, DRAW_CALL_BUDGET);
    drawCallsOverBudget = true;
  } else {
    drawCallsOverBudget = false;
  }

  if (snapshot.triangles > TRIANGLE_BUDGET) {
    if (!trianglesOverBudget) warn("triangles", snapshot.triangles, TRIANGLE_BUDGET);
    trianglesOverBudget = true;
  } else {
    trianglesOverBudget = false;
  }
}
