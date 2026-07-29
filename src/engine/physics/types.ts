/**
 * Sprint 3.4 — Liquid & Physics Experience. "Physics" here means the
 * lightweight, deterministic spring-damper surface simulation
 * docs/04_MOTION_ENGINE.md already named ("not a physics engine") and
 * docs/13_SHADER_ARCHITECTURE.md already designed (tilt uniform, ripple
 * array) two sprints ago — this module is that design, built for real.
 * No Rapier/Cannon/Ammo/PhysX; see [[docs/reviews/sprint-3.4-review.md]].
 */

/** Fixed-size ripple slots — never grown/shrunk at runtime, so stepping the simulation allocates nothing. */
export const MAX_RIPPLE_SLOTS = 4;

export interface RippleSlot {
  active: boolean;
  /** Radians — where on the rim this ripple originated, for a directional (not perfectly symmetric) wave. */
  originAngle: number;
  /** Current amplitude; decays toward 0, at which point the slot frees itself. */
  amplitude: number;
  elapsedSeconds: number;
}

/**
 * One mutable state bag, owned by exactly one simulation step function.
 * Mutated in place by `stepLiquidPhysics`/`triggerRipple` — no per-frame
 * allocation, matching the brief's "no unnecessary allocations."
 */
export interface LiquidPhysicsState {
  /** Radians — the liquid surface's current tilt, spring-damped toward a target derived from angular velocity. */
  tiltAngle: number;
  tiltVelocity: number;
  /** A secondary, lower-amplitude follower of `tiltAngle` — foam's "slight lag behind liquid." */
  foamLag: number;
  foamLagVelocity: number;
  /** Ice's own slower, smaller follower — independent of foam's. */
  iceLag: number;
  iceLagVelocity: number;
  /** A persistent, always-on slow drift — ice "floats" even at rest; deliberately excluded from `settled`. */
  iceIdlePhase: number;
  ripples: RippleSlot[];
  /** Monotonically increasing — feeds the deterministic ripple-origin sequence (`GOLDEN_ANGLE_RADIANS`), never `Math.random()`. */
  rippleTriggerCount: number;
  /** True once tilt + ripples (the liquid surface itself, not foam/ice) have decayed below their settle epsilons — the source of `liquid:stabilized`. Settles *before* `settled` below, since foam/ice are deliberately slower followers. */
  liquidSettled: boolean;
  /** True once every subsystem (tilt, ripples, foam lag, ice lag — NOT ice's permanent idle drift, which never settles by design) has decayed below its settle epsilon — the source of `physics:settled`. */
  settled: boolean;
}

/**
 * Adaptive-quality-aware simulation parameters — resolved once per tier via
 * `resolveQualityPolicy`, never a boolean kill switch. `intensity` is never
 * 0 at any tier ("never disable physics entirely"); lower tiers reduce
 * *how much* runs, not *whether* it runs.
 */
export interface LiquidPhysicsPolicy {
  /** 0-1, multiplies all displacement amplitude (tilt, ripple, lag). */
  intensity: number;
  /** How many of `MAX_RIPPLE_SLOTS` a lower tier is allowed to keep concurrently active — "reduce ripple resolution," not eliminate it. */
  maxActiveRipples: number;
  /** Whether foam/ice run their own independent spring follower (`true`) or cheaply alias a scaled copy of `tiltAngle` (`false`, lowest tiers) — "reduce secondary motion," never remove it outright. */
  secondaryMotion: boolean;
}

export interface LiquidPhysicsInput {
  /** Radians/frame-ish — `useCupInteractionState`'s `velocityRef.current`, whatever units it's already in; the spring's response constants are tuned to that unit, not physical radians/second. */
  angularVelocity: number;
  /** Seconds since the previous step — every spring/decay term is dt-scaled for reproducibility across a fixed dt sequence. */
  dt: number;
  /** Reduced motion: continuous oscillation becomes direct, non-overshooting interpolation instead — see `stepLiquidPhysics`. */
  reducedMotion: boolean;
  policy: LiquidPhysicsPolicy;
}
