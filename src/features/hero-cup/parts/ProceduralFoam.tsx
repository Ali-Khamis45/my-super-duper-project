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
import { materialOverridesToVariant } from "../lib/materialOverridesToVariant";
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
    const colorObj = materialOverrides?.color ? new THREE.Color(materialOverrides.color) : creamColor(100);
    const colorHex = `#${colorObj.getHexString()}`;

    // Sprint 3.8 fix: routed through the shared cache, same reasoning and
    // shape as ProceduralCoffee's identical fix — `applyFoamSurface` still
    // only runs inside the factory (a genuine cache miss), never on a hit.
    return getOrCreateMaterial({ surface: "foam", colorHex, variant: materialOverridesToVariant(undefined, materialOverrides) }, () => {
      const mat = createFoamMaterial(colorObj);
      if (materialOverrides) {
        updateMaterialParams(mat, "foam", materialOverrides);
        if (materialOverrides.color) updateMaterialColor(mat, colorObj);
      }
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
