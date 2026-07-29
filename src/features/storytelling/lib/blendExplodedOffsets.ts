import {
  ASSEMBLED_POSITION,
  ASSEMBLED_ROTATION,
  EXPLODED_LID_POSITION,
  EXPLODED_LID_ROTATION,
  EXPLODED_SLEEVE_POSITION,
} from "../data/explodedOffsets";

function scaleVec3(vector: [number, number, number], t: number): [number, number, number] {
  return [vector[0] * t, vector[1] * t, vector[2] * t];
}

export interface BlendedExplodedOffsets {
  lidPosition: [number, number, number];
  lidRotation: [number, number, number];
  sleevePosition: [number, number, number];
}

/**
 * `explodeAmount` 0 = fully assembled (today's exact, unmoved default —
 * `ASSEMBLED_POSITION`/`ASSEMBLED_ROTATION` are both `[0,0,0]`), 1 = fully
 * exploded. A plain linear blend toward `EXPLODED_*`, not an eased one —
 * the "settle" feel comes from `CupAssembly`'s own damped convergence
 * toward whatever target this function returns (the same layered
 * "continuous target, damped follower" split `CameraRig`'s parallax
 * already uses), not from easing this function's own output.
 */
export function blendExplodedOffsets(explodeAmount: number): BlendedExplodedOffsets {
  const t = Math.min(1, Math.max(0, explodeAmount));
  return {
    lidPosition: t === 0 ? ASSEMBLED_POSITION : scaleVec3(EXPLODED_LID_POSITION, t),
    lidRotation: t === 0 ? ASSEMBLED_ROTATION : scaleVec3(EXPLODED_LID_ROTATION, t),
    sleevePosition: t === 0 ? ASSEMBLED_POSITION : scaleVec3(EXPLODED_SLEEVE_POSITION, t),
  };
}
