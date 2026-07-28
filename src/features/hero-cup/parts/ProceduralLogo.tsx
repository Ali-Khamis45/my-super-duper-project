import { forwardRef, useMemo } from "react";
import type { Group } from "three";

import { getOrCreateLogoTexture } from "@/engine/graphics/TextureLoader";

import { cupRadiusAtHeight } from "../geometry/cupProfile";
import type { CupPartProps } from "../registry/types";

const LOGO_HEIGHT = 0.85;
const LOGO_SIZE = 0.24;

/**
 * A textured badge plane oriented against the cup wall — not a true
 * projected decal (drei's <Decal> requires nesting inside the target
 * mesh, which would couple this "independent" part to ProceduralCup's
 * internals). A flat oriented plane keeps the registry contract clean at a
 * small fidelity cost; upgradeable once a real logo asset + UV-mapped cup
 * mesh replace both. See docs/3d-asset-pipeline.md.
 */
export const ProceduralLogo = forwardRef<Group, CupPartProps>(function ProceduralLogo(
  { position, rotation, scale, visible },
  ref,
) {
  const texture = useMemo(() => getOrCreateLogoTexture(256), []);
  const radius = cupRadiusAtHeight(LOGO_HEIGHT) + 0.008;

  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale} visible={visible}>
      <mesh position={[0, LOGO_HEIGHT, radius]} rotation={[-0.15, 0, 0]}>
        <planeGeometry args={[LOGO_SIZE, LOGO_SIZE]} />
        <meshStandardMaterial map={texture} transparent roughness={0.4} />
      </mesh>
    </group>
  );
});
