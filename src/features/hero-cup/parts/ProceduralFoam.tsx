import { useFrame } from "@react-three/fiber";
import { forwardRef, useMemo } from "react";
import * as THREE from "three";
import type { Group } from "three";

import { createFoamMaterial, getOrCreateMaterial, updateMaterialColor, updateMaterialParams } from "@/engine/materials";
import { createLiquidPhysicsState } from "@/engine/physics";
import { applyFoamSurface, updateFoamLagUniforms } from "@/engine/shaders/foam/FoamSurface";
import { creamColor } from "@/engine/theme/ColorSchemes";

import { createFoamGeometry } from "../geometry/cupGeometry";
import { CUP_RIM_HEIGHT, cupRadiusAtHeight } from "../geometry/cupProfile";
import type { CupPartProps } from "../registry/types";

export const FOAM_HEIGHT = CUP_RIM_HEIGHT - 0.07;

/** Same "safe, at-rest default for callers without a physicsRef" reasoning as `ProceduralCoffee`'s. */
const RESTING_PHYSICS_STATE = createLiquidPhysicsState();

export const ProceduralFoam = forwardRef<Group, CupPartProps>(function ProceduralFoam(
  { position, rotation, scale, visible, materialOverrides, physicsRef },
  ref,
) {
  const geometry = useMemo(() => createFoamGeometry(cupRadiusAtHeight(FOAM_HEIGHT) * 0.88), []);

  const material = useMemo(() => {
    const colorObj = creamColor(100);

    if (materialOverrides) {
      const mat = createFoamMaterial(colorObj);
      updateMaterialParams(mat, "foam", materialOverrides);
      if (materialOverrides.color) updateMaterialColor(mat, new THREE.Color(materialOverrides.color));
      applyFoamSurface(mat);
      return mat;
    }

    // applyFoamSurface runs inside the factory — only on a real cache miss,
    // same reasoning as ProceduralCoffee.
    const colorHex = `#${colorObj.getHexString()}`;
    return getOrCreateMaterial({ surface: "foam", colorHex }, () => {
      const mat = createFoamMaterial(colorObj);
      applyFoamSurface(mat);
      return mat;
    }) as THREE.MeshPhysicalMaterial;
  }, [materialOverrides]);

  useFrame(() => {
    updateFoamLagUniforms(material, physicsRef?.current ?? RESTING_PHYSICS_STATE);
  });

  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale} visible={visible}>
      <mesh
        geometry={geometry}
        material={material}
        position={[0, FOAM_HEIGHT, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      />
    </group>
  );
});
