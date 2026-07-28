import { forwardRef, useMemo } from "react";
import * as THREE from "three";
import type { Group } from "three";

import { createLiquidMaterial, getOrCreateMaterial, resolveEnvMapIntensity, SURFACE_PRESETS, updateMaterialColor, updateMaterialParams } from "@/engine/materials";
import { themeToPresetMap } from "@/engine/theme/LightingThemes";
import { useActiveTheme } from "@/engine/theme/ThemeEngine";
import { espressoColor } from "@/engine/theme/ColorSchemes";

import { CUP_RIM_HEIGHT, cupRadiusAtHeight } from "../geometry/cupProfile";
import type { CupPartProps } from "../registry/types";

export const COFFEE_HEIGHT = CUP_RIM_HEIGHT - 0.12;

export const ProceduralCoffee = forwardRef<Group, CupPartProps>(function ProceduralCoffee(
  { position, rotation, scale, visible, materialOverrides },
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
      return mat;
    }

    const colorHex = `#${colorObj.getHexString()}`;
    return getOrCreateMaterial({ surface: "liquid", colorHex, variant: lightingPresetName }, () =>
      createLiquidMaterial(colorObj, { envMapIntensity }),
    ) as THREE.MeshPhysicalMaterial;
  }, [materialOverrides, lightingPresetName]);

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
