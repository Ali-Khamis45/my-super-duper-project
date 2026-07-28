import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { forwardRef, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Group, Mesh } from "three";

import { createRadialGradientTexture } from "@/engine/graphics/TextureLoader";

import { CUP_RIM_HEIGHT } from "../geometry/cupProfile";
import type { CupPartProps } from "../registry/types";

const STEAM_ORIGIN_HEIGHT = CUP_RIM_HEIGHT + 0.18;
const RISE_DISTANCE = 0.85;
const CYCLE_SECONDS = 3.4;
const PLANE_COUNT = 3;

/**
 * Placeholder-tier steam — billboarded, noise-textured planes with a rising
 * + fading loop, no custom shader/particle sim. This is the seam where a
 * real shader-based steam simulation slots in (Milestone 2); see
 * docs/03_3D_ENGINE.md.
 */
export const ProceduralSteam = forwardRef<Group, CupPartProps>(function ProceduralSteam(
  { position, rotation, scale, visible },
  ref,
) {
  const planeRefs = useRef<(Mesh | null)[]>([]);
  const texture = useMemo(() => createRadialGradientTexture(128), []);

  const materials = useMemo(
    () =>
      Array.from(
        { length: PLANE_COUNT },
        () =>
          new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
            opacity: 0,
          }),
      ),
    [texture],
  );

  useFrame(({ clock }) => {
    if (visible === false) return;
    const time = clock.getElapsedTime();

    for (let i = 0; i < PLANE_COUNT; i++) {
      const plane = planeRefs.current[i];
      const material = materials[i];
      if (!plane || !material) continue;

      const phase = i / PLANE_COUNT;
      const progress = (time / CYCLE_SECONDS + phase) % 1;

      plane.position.y = progress * RISE_DISTANCE;
      plane.position.x = Math.sin((progress + phase) * Math.PI * 2) * 0.06;

      const fadeIn = Math.min(progress / 0.2, 1);
      const fadeOut = Math.min((1 - progress) / 0.35, 1);
      material.opacity = Math.min(fadeIn, fadeOut) * 0.4;
      plane.scale.setScalar(0.35 + progress * 0.5);
    }
  });

  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale} visible={visible}>
      <group position={[0, STEAM_ORIGIN_HEIGHT, 0]}>
        {materials.map((material, i) => (
          <Billboard key={i}>
            <mesh
              ref={(el) => {
                planeRefs.current[i] = el;
              }}
              material={material}
            >
              <planeGeometry args={[0.4, 0.4]} />
            </mesh>
          </Billboard>
        ))}
      </group>
    </group>
  );
});
