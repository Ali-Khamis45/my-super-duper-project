import * as THREE from "three";

import { cupBodyProfile, cupRadiusAtHeight, lidProfile } from "./cupProfile";

export function createCupBodyGeometry(): THREE.LatheGeometry {
  return new THREE.LatheGeometry(cupBodyProfile, 64);
}

export function createLidGeometry(): THREE.LatheGeometry {
  return new THREE.LatheGeometry(lidProfile, 48);
}

/**
 * A handle loop, via a Catmull-Rom curve through control points rather than
 * a plain torus — a torus reads as a low-effort placeholder even at a
 * glance, while a curved tube through asymmetric control points reads as an
 * intentional, hand-shaped form.
 */
export function createHandleGeometry(): THREE.TubeGeometry {
  const attachLow = 0.55;
  const attachHigh = 1.05;
  const bulge = 0.3;

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(cupRadiusAtHeight(attachLow), attachLow, 0),
    new THREE.Vector3(cupRadiusAtHeight(attachLow) + bulge * 0.7, attachLow + 0.08, 0),
    new THREE.Vector3(cupRadiusAtHeight((attachLow + attachHigh) / 2) + bulge, (attachLow + attachHigh) / 2, 0),
    new THREE.Vector3(cupRadiusAtHeight(attachHigh) + bulge * 0.7, attachHigh - 0.08, 0),
    new THREE.Vector3(cupRadiusAtHeight(attachHigh), attachHigh, 0),
  ]);

  return new THREE.TubeGeometry(curve, 32, 0.045, 12, false);
}

/** A subtly irregular disc — foam's outer edge perturbed so it doesn't read as a flat cut-out. */
export function createFoamGeometry(radius: number): THREE.CircleGeometry {
  const geometry = new THREE.CircleGeometry(radius, 48);
  const position = geometry.attributes.position;
  if (!position) return geometry;

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const r = Math.hypot(x, y);
    if (r < radius - 0.001) continue;
    const angle = Math.atan2(y, x);
    const noise = 1 + 0.06 * Math.sin(angle * 7) + 0.03 * Math.sin(angle * 13 + 1.7);
    position.setXY(i, x * noise, y * noise);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}
