import { forwardRef, useMemo } from "react";
import * as THREE from "three";
import type { Group } from "three";

import { createLidMaterial, getOrCreateMaterial, updateMaterialParams } from "@/engine/materials";
import { espressoColor } from "@/engine/theme/ColorSchemes";

import { createLidGeometry } from "../geometry/cupGeometry";
import { LID_FLOAT_HEIGHT } from "../geometry/cupProfile";
import { materialOverridesToVariant } from "../lib/materialOverridesToVariant";
import type { CupPartProps } from "../registry/types";

export const ProceduralLid = forwardRef<Group, CupPartProps>(function ProceduralLid(
  { position, rotation, scale, visible, materialOverrides },
  ref,
) {
  const geometry = useMemo(() => createLidGeometry(), []);

  const material = useMemo(() => {
    const colorHex = materialOverrides?.color ?? `#${espressoColor(800).getHexString()}`;
    // Sprint 3.2: same shared-cache routing as ProceduralCup — see its comment.
    return getOrCreateMaterial(
      { surface: "lid", colorHex, variant: materialOverridesToVariant(undefined, materialOverrides) },
      () => {
        const mat = createLidMaterial(new THREE.Color(colorHex));
        if (materialOverrides) updateMaterialParams(mat, "lid", materialOverrides);
        return mat;
      },
    ) as THREE.MeshPhysicalMaterial;
  }, [materialOverrides]);

  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale} visible={visible}>
      <mesh
        geometry={geometry}
        material={material}
        position={[0, LID_FLOAT_HEIGHT, 0]}
        castShadow
        receiveShadow
      />
    </group>
  );
});
