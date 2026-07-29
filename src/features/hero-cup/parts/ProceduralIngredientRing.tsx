import { forwardRef, useMemo } from "react";
import * as THREE from "three";
import type { Group } from "three";

import { createIngredientMaterial, getOrCreateMaterial, updateMaterialParams } from "@/engine/materials";

import { createIngredientRingGeometry } from "../geometry/cupGeometry";
import { materialOverridesToVariant } from "../lib/materialOverridesToVariant";
import type { CupPartProps } from "../registry/types";

const RING_RADIUS = 0.5;
const RING_THICKNESS = 0.05;

/**
 * Sprint 3.3 — the shared visual for every "ring-style" ingredient layer
 * (foam-topping/cream/chocolate/caramel/cinnamon/ice/milk/syrup — see
 * `geometry/cupGeometry.ts`'s `createIngredientRingGeometry` doc comment
 * for why one shared shape, not eight bespoke ones). One geometry instance
 * (`useMemo`, empty deps — never recreated), color/finish routed through
 * the shared material cache exactly like `ProceduralCup`/`Sleeve`/`Lid`
 * (Sprint 3.2's fix, followed from the start here rather than repeated as
 * a bug). Multiple simultaneous ingredient layers render multiple
 * instances of this same component with different `position`/`scale`/
 * `materialOverrides` — `CupAssembly` owns picking those values, this
 * component has no opinion on what "chocolate" or "milk" means.
 */
export const ProceduralIngredientRing = forwardRef<Group, CupPartProps>(function ProceduralIngredientRing(
  { position, rotation, scale, visible, materialOverrides },
  ref,
) {
  const geometry = useMemo(() => createIngredientRingGeometry(RING_RADIUS, RING_THICKNESS), []);

  const material = useMemo(() => {
    const colorHex = materialOverrides?.color ?? "#ffffff";
    return getOrCreateMaterial(
      { surface: "ingredient", colorHex, variant: materialOverridesToVariant(undefined, materialOverrides) },
      () => {
        const mat = createIngredientMaterial(new THREE.Color(colorHex));
        if (materialOverrides) updateMaterialParams(mat, "ingredient", materialOverrides);
        return mat;
      },
    ) as THREE.MeshPhysicalMaterial;
  }, [materialOverrides]);

  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale} visible={visible}>
      <mesh geometry={geometry} material={material} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow />
    </group>
  );
});
