import * as THREE from "three";

/**
 * Hand-authored silhouette profiles for THREE.LatheGeometry — (radius, height)
 * pairs revolved around the Y axis. Kept as plain data so a future GLB swap
 * only touches registry/cupPartRegistry.ts, never this shape data.
 */

/** Cup body: open top, flat bottom disc formed by starting the profile at the axis. */
export const cupBodyProfile: THREE.Vector2[] = [
  [0, 0],
  [0.42, 0],
  [0.44, 0.05],
  [0.5, 0.2],
  [0.56, 0.55],
  [0.62, 0.95],
  [0.665, 1.3],
  [0.69, 1.5],
  [0.705, 1.58],
  [0.695, 1.615],
].map(([x, y]) => new THREE.Vector2(x, y));

/** Lid: dome top + a skirt that drops below y=0 to grip the cup rim. */
export const lidProfile: THREE.Vector2[] = [
  [0, 0.14],
  [0.1, 0.145],
  [0.45, 0.13],
  [0.68, 0.06],
  [0.725, 0.02],
  [0.725, -0.06],
].map(([x, y]) => new THREE.Vector2(x, y));

/** Radius the cup wall reaches at a given profile height — used to size the sleeve/coffee/foam to match. */
export function cupRadiusAtHeight(height: number): number {
  for (let i = 1; i < cupBodyProfile.length; i++) {
    const prevPoint = cupBodyProfile[i - 1];
    const point = cupBodyProfile[i];
    if (!prevPoint || !point) continue;
    if (height >= prevPoint.y && height <= point.y) {
      const t = (height - prevPoint.y) / (point.y - prevPoint.y || 1);
      return THREE.MathUtils.lerp(prevPoint.x, point.x, t);
    }
  }
  return (cupBodyProfile.at(-1) ?? new THREE.Vector2()).x;
}

export const CUP_RIM_HEIGHT = 1.58;
export const SLEEVE_BOTTOM_HEIGHT = 0.4;
export const SLEEVE_TOP_HEIGHT = 0.95;

/**
 * The lid floats above the rim rather than sitting flush — a deliberate
 * "popped off" composition so coffee/foam/steam (the sensory payoff) stay
 * visible in the default view, instead of being hidden under an opaque lid.
 */
export const LID_FLOAT_HEIGHT = CUP_RIM_HEIGHT + 0.22;
