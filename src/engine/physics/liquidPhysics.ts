import { MAX_RIPPLE_SLOTS } from "./types";
import type { LiquidPhysicsInput, LiquidPhysicsPolicy, LiquidPhysicsState, RippleSlot } from "./types";

/**
 * Every tunable constant for the "not a physics engine" spring-damper
 * simulation docs/04_MOTION_ENGINE.md and docs/13_SHADER_ARCHITECTURE.md
 * already named. Perceptually tuned (subtle, "not exaggerated" per the
 * brief's Creative Budget), not physically derived.
 */
const TILT_RESPONSE = 1.4; // angularVelocity -> tilt target scale
const MAX_TILT_ANGLE = 0.09; // ~5 degrees — a wobble, not a dramatic lean
const TILT_STIFFNESS = 140;
const TILT_DAMPING_PER_SECOND = 0.0025; // multiplies velocity per second — small means strong damping
const REDUCED_MOTION_LERP_RATE = 10; // 1/seconds — direct interpolation rate when oscillation is disabled

const FOAM_LAG_SCALE = 0.55; // foam moves less than the liquid itself
const FOAM_STIFFNESS = 55; // lower than TILT_STIFFNESS -> visibly lags
const FOAM_DAMPING_PER_SECOND = 0.02;

const ICE_LAG_SCALE = 0.35; // ice moves even less than foam
const ICE_STIFFNESS = 30;
const ICE_DAMPING_PER_SECOND = 0.05;
const ICE_IDLE_DRIFT_SPEED = 0.6; // rad/s of phase — a slow, permanent, tiny bob; excluded from `settled`
const ICE_IDLE_DRIFT_AMPLITUDE = 0.015;

const RIPPLE_DECAY_PER_SECOND = 0.12; // amplitude multiplier after 1s
const RIPPLE_MAX_LIFETIME_SECONDS = 2.5;
const RIPPLE_AMPLITUDE_EPSILON = 0.0015;
/** Golden-angle stepping — a deterministic, well-distributed sequence of ripple origins around the rim, never `Math.random()` (Sprint 3.3's sprinkles established this same "seeded, not random" pattern for this project). */
const GOLDEN_ANGLE_RADIANS = 2.399963229728653;

const SETTLE_VELOCITY_EPSILON = 0.0004;
const SETTLE_ANGLE_EPSILON = 0.0008;

export function createLiquidPhysicsState(): LiquidPhysicsState {
  return {
    tiltAngle: 0,
    tiltVelocity: 0,
    foamLag: 0,
    foamLagVelocity: 0,
    iceLag: 0,
    iceLagVelocity: 0,
    iceIdlePhase: 0,
    ripples: Array.from({ length: MAX_RIPPLE_SLOTS }, () => ({ active: false, originAngle: 0, amplitude: 0, elapsedSeconds: 0 }) as RippleSlot),
    rippleTriggerCount: 0,
    liquidSettled: true,
    settled: true,
  };
}

/** Semi-implicit Euler, dt-scaled — frame-rate independent, deterministic for a fixed dt sequence. */
function springTowards(value: number, velocity: number, target: number, stiffness: number, dampingPerSecond: number, dt: number): [number, number] {
  let nextVelocity = velocity + (target - value) * stiffness * dt;
  nextVelocity *= Math.pow(dampingPerSecond, dt);
  const nextValue = value + nextVelocity * dt;
  return [nextValue, nextVelocity];
}

/** No overshoot, no oscillation — the "simplified interpolation" reduced motion replaces continuous spring oscillation with. */
function lerpTowards(value: number, target: number, ratePerSecond: number, dt: number): number {
  const t = 1 - Math.exp(-ratePerSecond * dt);
  return value + (target - value) * t;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Activates the next free ripple slot (or, if every slot is occupied, the
 * one furthest along in its decay — never grows the array). No-ops past
 * `policy.maxActiveRipples` concurrently active ripples ("reduce ripple
 * resolution" at lower quality tiers, never triggering none at all — a real
 * ripple still plays, just capped in how many overlap).
 */
export function triggerRipple(state: LiquidPhysicsState, policy: LiquidPhysicsPolicy, magnitude: number): void {
  const activeCount = state.ripples.reduce((count, ripple) => count + (ripple.active ? 1 : 0), 0);
  if (activeCount >= Math.max(1, policy.maxActiveRipples)) return;

  const slot = state.ripples.find((ripple) => !ripple.active) ?? state.ripples.reduce((oldest, ripple) => (ripple.elapsedSeconds > oldest.elapsedSeconds ? ripple : oldest));

  slot.active = true;
  slot.elapsedSeconds = 0;
  slot.amplitude = clamp(magnitude, 0, 1) * policy.intensity;
  slot.originAngle = (state.rippleTriggerCount * GOLDEN_ANGLE_RADIANS) % (Math.PI * 2);
  state.rippleTriggerCount += 1;
  state.settled = false;
}

function stepRipple(ripple: RippleSlot, dt: number): void {
  if (!ripple.active) return;
  ripple.elapsedSeconds += dt;
  ripple.amplitude *= Math.pow(RIPPLE_DECAY_PER_SECOND, dt);
  if (ripple.amplitude < RIPPLE_AMPLITUDE_EPSILON || ripple.elapsedSeconds > RIPPLE_MAX_LIFETIME_SECONDS) {
    ripple.active = false;
    ripple.amplitude = 0;
  }
}

/**
 * The single simulation step, called once per frame by exactly one owner
 * (`useLiquidPhysics`). Mutates `state` in place and returns it — no
 * per-frame allocation. Deterministic: identical `state`/`input` sequences
 * always produce identical output sequences (no `Math.random()`, no
 * wall-clock reads — `input.dt` is the caller's responsibility).
 */
export function stepLiquidPhysics(state: LiquidPhysicsState, input: LiquidPhysicsInput): LiquidPhysicsState {
  const { angularVelocity, dt, reducedMotion, policy } = input;
  const tiltTarget = clamp(angularVelocity * TILT_RESPONSE, -MAX_TILT_ANGLE, MAX_TILT_ANGLE) * policy.intensity;

  if (reducedMotion) {
    state.tiltAngle = lerpTowards(state.tiltAngle, tiltTarget, REDUCED_MOTION_LERP_RATE, dt);
    state.tiltVelocity = 0;
  } else {
    [state.tiltAngle, state.tiltVelocity] = springTowards(state.tiltAngle, state.tiltVelocity, tiltTarget, TILT_STIFFNESS, TILT_DAMPING_PER_SECOND, dt);
    // A real spring can transiently overshoot its target — realistic, and
    // part of the "wobble" feel — but hard-bounded here so no input
    // magnitude can ever push the visible tilt past a subtle, "not
    // exaggerated" range, regardless of how large `angularVelocity` spikes.
    state.tiltAngle = clamp(state.tiltAngle, -MAX_TILT_ANGLE, MAX_TILT_ANGLE);
  }

  const foamTarget = state.tiltAngle * FOAM_LAG_SCALE;
  if (reducedMotion) {
    state.foamLag = lerpTowards(state.foamLag, foamTarget, REDUCED_MOTION_LERP_RATE * 0.6, dt);
    state.foamLagVelocity = 0;
  } else if (policy.secondaryMotion) {
    [state.foamLag, state.foamLagVelocity] = springTowards(state.foamLag, state.foamLagVelocity, foamTarget, FOAM_STIFFNESS, FOAM_DAMPING_PER_SECOND, dt);
  } else {
    // Lowest tiers: skip the follower's own spring integration entirely and
    // just alias a cheap, still-nonzero fraction of the primary signal —
    // "reduce secondary motion," never remove it (see LiquidPhysicsPolicy).
    state.foamLag = foamTarget;
    state.foamLagVelocity = 0;
  }

  const iceTarget = state.tiltAngle * ICE_LAG_SCALE;
  if (reducedMotion) {
    state.iceLag = lerpTowards(state.iceLag, iceTarget, REDUCED_MOTION_LERP_RATE * 0.4, dt);
    state.iceLagVelocity = 0;
  } else if (policy.secondaryMotion) {
    [state.iceLag, state.iceLagVelocity] = springTowards(state.iceLag, state.iceLagVelocity, iceTarget, ICE_STIFFNESS, ICE_DAMPING_PER_SECOND, dt);
  } else {
    state.iceLag = iceTarget;
    state.iceLagVelocity = 0;
  }

  // Ice's permanent slow drift — deliberately NOT gated by reducedMotion's
  // oscillation ban: this is idle ambient presence (the brief's "Idle Calm
  // State"), the same category as the cup's own idle float/rotation, which
  // already runs under reduced motion too (only *interaction-driven*
  // oscillation is what reduced motion disables).
  state.iceIdlePhase = (state.iceIdlePhase + ICE_IDLE_DRIFT_SPEED * dt) % (Math.PI * 2);

  for (const ripple of state.ripples) stepRipple(ripple, dt);

  const tiltSettled = Math.abs(state.tiltVelocity) < SETTLE_VELOCITY_EPSILON && Math.abs(state.tiltAngle) < SETTLE_ANGLE_EPSILON;
  const foamSettled = Math.abs(state.foamLagVelocity) < SETTLE_VELOCITY_EPSILON && Math.abs(state.foamLag) < SETTLE_ANGLE_EPSILON;
  const iceSettled = Math.abs(state.iceLagVelocity) < SETTLE_VELOCITY_EPSILON && Math.abs(state.iceLag) < SETTLE_ANGLE_EPSILON;
  const ripplesSettled = state.ripples.every((ripple) => !ripple.active);
  state.liquidSettled = tiltSettled && ripplesSettled;
  state.settled = state.liquidSettled && foamSettled && iceSettled;

  return state;
}

/** Ice's idle bob offset — a pure read, not part of the mutable step (no state to settle, it's permanent ambient motion). */
export function resolveIceIdleOffset(state: LiquidPhysicsState): number {
  return Math.sin(state.iceIdlePhase) * ICE_IDLE_DRIFT_AMPLITUDE;
}
