import { forwardRef, useMemo } from "react";
import * as THREE from "three";
import type { Group } from "three";

import { createCeramicMaterial, getOrCreateMaterial, resolveEnvMapIntensity, SURFACE_PRESETS, updateMaterialColor, updateMaterialParams } from "@/engine/materials";
import { themeToPresetMap } from "@/engine/theme/LightingThemes";
import { useActiveTheme } from "@/engine/theme/ThemeEngine";
import { creamColor } from "@/engine/theme/ColorSchemes";

import { createCupBodyGeometry, createHandleGeometry } from "../geometry/cupGeometry";
import type { CupPartProps } from "../registry/types";

/** The cup body + its handle — one physical piece, one registry part. */
export const ProceduralCup = forwardRef<Group, CupPartProps>(function ProceduralCup(
  { position, rotation, scale, visible, materialOverrides },
  ref,
) {
  const bodyGeometry = useMemo(() => createCupBodyGeometry(), []);
  const handleGeometry = useMemo(() => createHandleGeometry(), []);
  const theme = useActiveTheme();
  const { lighting: lightingPresetName } = themeToPresetMap[theme];

  const material = useMemo(() => {
    const colorObj = creamColor(50);
    const envMapIntensity = resolveEnvMapIntensity(lightingPresetName, SURFACE_PRESETS.ceramic.envMapIntensity ?? 1);

    if (materialOverrides) {
      // Overridden materials are one-off — created directly, never shared
      // via the cache, so a future customizer's per-instance tweak can't
      // leak into another consumer requesting the same base key.
      const mat = createCeramicMaterial(colorObj, { envMapIntensity });
      updateMaterialParams(mat, "ceramic", materialOverrides);
      if (materialOverrides.color) updateMaterialColor(mat, new THREE.Color(materialOverrides.color));
      return mat;
    }

    const colorHex = `#${colorObj.getHexString()}`;
    return getOrCreateMaterial({ surface: "ceramic", colorHex, variant: lightingPresetName }, () =>
      createCeramicMaterial(colorObj, { envMapIntensity }),
    ) as THREE.MeshPhysicalMaterial;
  }, [materialOverrides, lightingPresetName]);

  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale} visible={visible}>
      <mesh geometry={bodyGeometry} material={material} castShadow receiveShadow />
      <mesh geometry={handleGeometry} material={material} castShadow receiveShadow />
    </group>
  );
});
