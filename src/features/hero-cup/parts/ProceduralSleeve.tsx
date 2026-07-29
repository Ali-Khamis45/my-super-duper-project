import { forwardRef, useMemo } from "react";
import * as THREE from "three";
import type { Group } from "three";

import { createSleeveMaterial, getOrCreateMaterial, updateMaterialParams } from "@/engine/materials";
import { espressoColor } from "@/engine/theme/ColorSchemes";

import { cupRadiusAtHeight, SLEEVE_BOTTOM_HEIGHT, SLEEVE_TOP_HEIGHT } from "../geometry/cupProfile";
import { materialOverridesToVariant } from "../lib/materialOverridesToVariant";
import type { CupPartProps } from "../registry/types";

const RIM_CLEARANCE = 0.012;

export const ProceduralSleeve = forwardRef<Group, CupPartProps>(function ProceduralSleeve(
  { position, rotation, scale, visible, materialOverrides },
  ref,
) {
  const geometry = useMemo(() => {
    const radiusTop = cupRadiusAtHeight(SLEEVE_TOP_HEIGHT) + RIM_CLEARANCE;
    const radiusBottom = cupRadiusAtHeight(SLEEVE_BOTTOM_HEIGHT) + RIM_CLEARANCE;
    const height = SLEEVE_TOP_HEIGHT - SLEEVE_BOTTOM_HEIGHT;
    return new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 48, 1, true);
  }, []);

  const material = useMemo(() => {
    const colorHex = materialOverrides?.color ?? `#${espressoColor(400).getHexString()}`;
    // Sprint 3.2: same shared-cache routing as ProceduralCup — see its comment.
    return getOrCreateMaterial(
      { surface: "sleeve", colorHex, variant: materialOverridesToVariant(undefined, materialOverrides) },
      () => {
        const mat = createSleeveMaterial(new THREE.Color(colorHex));
        if (materialOverrides) updateMaterialParams(mat, "sleeve", materialOverrides);
        return mat;
      },
    ) as THREE.MeshPhysicalMaterial;
  }, [materialOverrides]);

  const centerHeight = (SLEEVE_BOTTOM_HEIGHT + SLEEVE_TOP_HEIGHT) / 2;

  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale} visible={visible}>
      <mesh geometry={geometry} material={material} position={[0, centerHeight, 0]} castShadow receiveShadow />
    </group>
  );
});
