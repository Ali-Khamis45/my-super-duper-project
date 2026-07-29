import { describe, expect, it } from "vitest";

import { createLiquidPhysicsState, resolveIceIdleOffset, stepLiquidPhysics, triggerRipple } from "./liquidPhysics";
import { MAX_RIPPLE_SLOTS } from "./types";
import type { LiquidPhysicsPolicy, LiquidPhysicsState } from "./types";

const FULL_POLICY: LiquidPhysicsPolicy = { intensity: 1, maxActiveRipples: MAX_RIPPLE_SLOTS, secondaryMotion: true };
const FIXED_DT = 1 / 60;

function stepN(state: LiquidPhysicsState, n: number, angularVelocity: number, policy = FULL_POLICY, reducedMotion = false) {
  for (let i = 0; i < n; i++) {
    stepLiquidPhysics(state, { angularVelocity, dt: FIXED_DT, reducedMotion, policy });
  }
  return state;
}

describe("stepLiquidPhysics", () => {
  it("starts settled, at rest", () => {
    const state = createLiquidPhysicsState();
    expect(state.settled).toBe(true);
    expect(state.tiltAngle).toBe(0);
  });

  it("a sustained angular velocity drives tilt toward a target, then holding still lets it decay back toward 0", () => {
    const state = createLiquidPhysicsState();
    stepN(state, 30, 0.05);
    const peakTilt = Math.abs(state.tiltAngle);
    expect(peakTilt).toBeGreaterThan(0);

    stepN(state, 300, 0);
    expect(Math.abs(state.tiltAngle)).toBeLessThan(peakTilt);
    expect(Math.abs(state.tiltAngle)).toBeLessThan(0.001);
    expect(state.settled).toBe(true);
  });

  it("tilt never exceeds the configured maximum regardless of how large the input velocity is", () => {
    const state = createLiquidPhysicsState();
    stepN(state, 120, 50);
    expect(Math.abs(state.tiltAngle)).toBeLessThanOrEqual(0.09 + 1e-9);
  });

  it("is deterministic: identical input sequences produce bit-identical output sequences", () => {
    const stateA = createLiquidPhysicsState();
    const stateB = createLiquidPhysicsState();
    const velocities = [0.01, 0.03, -0.02, 0, 0.05, -0.01, 0, 0, 0.02, -0.04];

    for (const v of velocities) {
      stepLiquidPhysics(stateA, { angularVelocity: v, dt: FIXED_DT, reducedMotion: false, policy: FULL_POLICY });
      stepLiquidPhysics(stateB, { angularVelocity: v, dt: FIXED_DT, reducedMotion: false, policy: FULL_POLICY });
    }

    expect(stateA).toEqual(stateB);
  });

  it("foam lags behind the liquid: at the moment tilt is still rising, foam's magnitude is smaller than tilt's", () => {
    const state = createLiquidPhysicsState();
    stepN(state, 5, 0.06);
    expect(Math.abs(state.foamLag)).toBeLessThan(Math.abs(state.tiltAngle));
  });

  it("ice lags behind foam similarly", () => {
    const state = createLiquidPhysicsState();
    stepN(state, 5, 0.06);
    expect(Math.abs(state.iceLag)).toBeLessThan(Math.abs(state.foamLag));
  });

  it("reduced motion converges without overshoot (tilt magnitude never exceeds its target on the way there)", () => {
    const state = createLiquidPhysicsState();
    const target = 0.03 * 1.4; // matches TILT_RESPONSE in the implementation, loosely
    for (let i = 0; i < 60; i++) {
      stepLiquidPhysics(state, { angularVelocity: 0.03, dt: FIXED_DT, reducedMotion: true, policy: FULL_POLICY });
      expect(Math.abs(state.tiltAngle)).toBeLessThanOrEqual(target + 1e-6);
    }
  });

  it("scales displacement with policy.intensity — half intensity produces a smaller (but still nonzero) tilt for the same input", () => {
    const fullState = stepN(createLiquidPhysicsState(), 20, 0.05, FULL_POLICY);
    const halfPolicy: LiquidPhysicsPolicy = { ...FULL_POLICY, intensity: 0.5 };
    const halfState = stepN(createLiquidPhysicsState(), 20, 0.05, halfPolicy);

    expect(Math.abs(halfState.tiltAngle)).toBeGreaterThan(0);
    expect(Math.abs(halfState.tiltAngle)).toBeLessThan(Math.abs(fullState.tiltAngle));
  });

  it("policy.intensity of 0 still produces a settled-but-present (zero-amplitude) simulation, never a crash or NaN — physics is never truly disabled by the caller skipping the step", () => {
    const zeroPolicy: LiquidPhysicsPolicy = { intensity: 0, maxActiveRipples: 1, secondaryMotion: false };
    const state = stepN(createLiquidPhysicsState(), 60, 0.5, zeroPolicy);
    expect(Number.isFinite(state.tiltAngle)).toBe(true);
    expect(state.tiltAngle).toBe(0);
  });
});

describe("liquidSettled vs settled", () => {
  it("liquidSettled becomes true before settled, since foam/ice lag behind and take longer to decay", () => {
    const state = createLiquidPhysicsState();
    stepN(state, 20, 0.05); // disturb
    expect(state.liquidSettled).toBe(false);
    expect(state.settled).toBe(false);

    // Step forward frame by frame, watching for the first frame each flag flips true.
    let liquidSettledAtStep = -1;
    let settledAtStep = -1;
    for (let i = 0; i < 600; i++) {
      stepLiquidPhysics(state, { angularVelocity: 0, dt: FIXED_DT, reducedMotion: false, policy: FULL_POLICY });
      if (liquidSettledAtStep === -1 && state.liquidSettled) liquidSettledAtStep = i;
      if (settledAtStep === -1 && state.settled) settledAtStep = i;
    }

    expect(liquidSettledAtStep).toBeGreaterThan(-1);
    expect(settledAtStep).toBeGreaterThan(-1);
    expect(liquidSettledAtStep).toBeLessThanOrEqual(settledAtStep);
  });
});

describe("triggerRipple", () => {
  it("activates a free slot with a positive amplitude and a deterministic origin angle", () => {
    const state = createLiquidPhysicsState();
    triggerRipple(state, FULL_POLICY, 1);
    const active = state.ripples.filter((r) => r.active);
    expect(active).toHaveLength(1);
    expect(active[0]!.amplitude).toBeGreaterThan(0);
    expect(state.settled).toBe(false);
  });

  it("decays to inactive over time, freeing the slot", () => {
    const state = createLiquidPhysicsState();
    triggerRipple(state, FULL_POLICY, 1);
    for (let i = 0; i < 600; i++) {
      stepLiquidPhysics(state, { angularVelocity: 0, dt: FIXED_DT, reducedMotion: false, policy: FULL_POLICY });
    }
    expect(state.ripples.every((r) => !r.active)).toBe(true);
    expect(state.settled).toBe(true);
  });

  it("never activates more than policy.maxActiveRipples concurrently — caps overlap without refusing the disturbance entirely", () => {
    const state = createLiquidPhysicsState();
    const cappedPolicy: LiquidPhysicsPolicy = { intensity: 1, maxActiveRipples: 2, secondaryMotion: true };
    for (let i = 0; i < MAX_RIPPLE_SLOTS; i++) triggerRipple(state, cappedPolicy, 1);
    const active = state.ripples.filter((r) => r.active);
    expect(active.length).toBeLessThanOrEqual(2);
  });

  it("each successive trigger gets a different origin angle (a real distributed sequence, not a repeated constant)", () => {
    const state = createLiquidPhysicsState();
    triggerRipple(state, FULL_POLICY, 1);
    const first = state.ripples.find((r) => r.active)!.originAngle;
    // Free the slot so the next trigger doesn't reuse it via the "oldest" fallback with a different meaning.
    state.ripples.forEach((r) => (r.active = false));
    triggerRipple(state, FULL_POLICY, 1);
    const second = state.ripples.find((r) => r.active)!.originAngle;
    expect(second).not.toBe(first);
  });
});

describe("resolveIceIdleOffset", () => {
  it("is a small, bounded, always-present oscillation independent of the settled flag", () => {
    const state = createLiquidPhysicsState();
    expect(state.settled).toBe(true);
    stepN(state, 30, 0);
    expect(state.settled).toBe(true);
    // Even fully settled (no disturbance ever happened), ice's idle phase has advanced and produces a nonzero-range offset.
    const offset = resolveIceIdleOffset(state);
    expect(Math.abs(offset)).toBeLessThanOrEqual(0.015 + 1e-9);
  });
});
