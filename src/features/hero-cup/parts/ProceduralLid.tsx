import { forwardRef, useMemo } from "react";
import * as THREE from "three";
import type { Group } from "three";

import { createLidMaterial, getOrCreateMaterial, updateMaterialColor, updateMaterialParams } from "@/engine/materials";
import { espressoColor } from "@/engine/theme/ColorSchemes";

import { createLidGeometry } from "../geometry/cupGeometry";
import { LID_FLOAT_HEIGHT } from "../geometry/cupProfile";
import type { CupPartProps } from "../registry/types";

export const ProceduralLid = forwardRef<Group, CupPartProps>(function ProceduralLid(
  { position, rotation, scale, visible, materialOverrides },
  ref,
) {
  const geometry = useMemo(() => createLidGeometry(), []);

  const material = useMemo(() => {
    const colorObj = espressoColor(800);

    if (materialOverrides) {
      const mat = createLidMaterial(colorObj);
      updateMaterialParams(mat, "lid", materialOverrides);
      if (materialOverrides.color) updateMaterialColor(mat, new THREE.Color(materialOverrides.color));
      return mat;
    }

    const colorHex = `#${colorObj.getHexString()}`;
    return getOrCreateMaterial({ surface: "lid", colorHex }, () => createLidMaterial(colorObj)) as THREE.MeshPhysicalMaterial;
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
