import { forwardRef, useMemo } from "react";
import * as THREE from "three";
import type { Group } from "three";

import { createCeramicMaterial, getOrCreateMaterial, resolveEnvMapIntensity, SURFACE_PRESETS, updateMaterialParams } from "@/engine/materials";
import { themeToPresetMap } from "@/engine/theme/LightingThemes";
import { useActiveTheme } from "@/engine/theme/ThemeEngine";
import { creamColor } from "@/engine/theme/ColorSchemes";

import { createCupBodyGeometry, createHandleGeometry } from "../geometry/cupGeometry";
import type { CupPartProps } from "../registry/types";
import { materialOverridesToVariant } from "../lib/materialOverridesToVariant";

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
    const envMapIntensity = resolveEnvMapIntensity(lightingPresetName, SURFACE_PRESETS.ceramic.envMapIntensity ?? 1);
    const colorHex = materialOverrides?.color ?? `#${creamColor(50).getHexString()}`;
    // Sprint 3.2: routed through the shared cache, not a one-off instance —
    // the cache key fully encodes color + finish (`materialOverridesToVariant`),
    // so distinct customizer selections never collide and repeat selections
    // (undo/redo, revisiting a prior swatch) hit an already-compiled
    // material instead of paying GLSL compile cost again. See this
    // component's material factory: it only runs on a genuine cache miss.
    return getOrCreateMaterial(
      { surface: "ceramic", colorHex, variant: materialOverridesToVariant(lightingPresetName, materialOverrides) },
      () => {
        const mat = createCeramicMaterial(new THREE.Color(colorHex), { envMapIntensity });
        if (materialOverrides) updateMaterialParams(mat, "ceramic", materialOverrides);
        return mat;
      },
    ) as THREE.MeshPhysicalMaterial;
  }, [materialOverrides, lightingPresetName]);

  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale} visible={visible}>
      <mesh geometry={bodyGeometry} material={material} castShadow receiveShadow />
      <mesh geometry={handleGeometry} material={material} castShadow receiveShadow />
    </group>
  );
});
