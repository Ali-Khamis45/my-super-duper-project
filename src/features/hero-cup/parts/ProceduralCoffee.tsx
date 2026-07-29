import { useFrame } from "@react-three/fiber";
import { forwardRef, useMemo } from "react";
import * as THREE from "three";
import type { Group } from "three";

import { createLiquidMaterial, getOrCreateMaterial, resolveEnvMapIntensity, SURFACE_PRESETS, updateMaterialColor, updateMaterialParams } from "@/engine/materials";
import { createLiquidPhysicsState } from "@/engine/physics";
import { applyCoffeeSurface, updateLiquidDeformationUniforms } from "@/engine/shaders/coffee/CoffeeSurface";
import { themeToPresetMap } from "@/engine/theme/LightingThemes";
import { useActiveTheme } from "@/engine/theme/ThemeEngine";
import { espressoColor } from "@/engine/theme/ColorSchemes";

import { CUP_RIM_HEIGHT, cupRadiusAtHeight } from "../geometry/cupProfile";
import type { CupPartProps } from "../registry/types";

export const COFFEE_HEIGHT = CUP_RIM_HEIGHT - 0.12;

/** A part with no `physicsRef` (any consumer that existed before Sprint 3.4) still renders — just permanently at-rest displacement, matching Sprint 3.3's own "undefined props are safe no-ops" precedent. */
const RESTING_PHYSICS_STATE = createLiquidPhysicsState();

export const ProceduralCoffee = forwardRef<Group, CupPartProps>(function ProceduralCoffee(
  { position, rotation, scale, visible, materialOverrides, physicsRef },
  ref,
) {
  const geometry = useMemo(() => {
    const radius = cupRadiusAtHeight(COFFEE_HEIGHT) * 0.92;
    return new THREE.CircleGeometry(radius, 48);
  }, []);
  const theme = useActiveTheme();
  const { lighting: lightingPresetName } = themeToPresetMap[theme];

  const material = useMemo(() => {
    const colorObj = espressoColor(900);
    const envMapIntensity = resolveEnvMapIntensity(lightingPresetName, SURFACE_PRESETS.liquid.envMapIntensity ?? 1);

    if (materialOverrides) {
      const mat = createLiquidMaterial(colorObj, { envMapIntensity });
      updateMaterialParams(mat, "liquid", materialOverrides);
      if (materialOverrides.color) updateMaterialColor(mat, new THREE.Color(materialOverrides.color));
      applyCoffeeSurface(mat);
      return mat;
    }

    // applyCoffeeSurface runs inside the factory — only on a real cache
    // miss. Calling it after getOrCreateMaterial returns (on a cache hit)
    // would re-set onBeforeCompile and force a wasted recompile.
    const colorHex = `#${colorObj.getHexString()}`;
    return getOrCreateMaterial({ surface: "liquid", colorHex, variant: lightingPresetName }, () => {
      const mat = createLiquidMaterial(colorObj, { envMapIntensity });
      applyCoffeeSurface(mat);
      return mat;
    }) as THREE.MeshPhysicalMaterial;
  }, [materialOverrides, lightingPresetName]);

  // This part owns *applying* physics to its own material every frame —
  // `useLiquidPhysics` owns *computing* the values once, shared across
  // every reader (see that hook's doc comment on "exactly one owner").
  useFrame(() => {
    updateLiquidDeformationUniforms(material, physicsRef?.current ?? RESTING_PHYSICS_STATE);
  });

  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale} visible={visible}>
      <mesh
        geometry={geometry}
        material={material}
        position={[0, COFFEE_HEIGHT, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      />
    </group>
  );
});
