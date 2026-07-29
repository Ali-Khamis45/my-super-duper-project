"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";

import { float } from "@/engine/motion/presets";

import { useCupInteractionState } from "../hooks/useCupInteractionState";
import { useLiquidPhysics } from "../hooks/useLiquidPhysics";
import { CUP_PART_ORDER, resolveCupPart } from "../registry/cupPartRegistry";
import type { CupPartName, CupPartProps, ResolvedIngredientLayer } from "../registry/types";

interface CupAssemblyProps {
  reducedMotion: boolean;
  /**
   * Sprint 3.2 — per-part `CupPartProps` overrides (color/material/
   * visibility), keyed by part name. `undefined`/omitted for every existing
   * caller (the Hero route never passes this), so behavior there is
   * byte-for-byte unchanged. Only `features/customizer/` supplies real
   * values, computed by its own `resolvePartOverrides` — this component has
   * zero knowledge of "customizer" concepts, it just applies whatever
   * `CupPartProps` it's handed, the same contract every part already
   * implements.
   */
  partOverrides?: Partial<Record<CupPartName, CupPartProps>>;
  /** Overall assembly scale — cup size variants. Defaults to 1 (unchanged Hero-route sizing) when omitted. */
  scale?: number;
  /**
   * Sprint 3.3 — zero-to-many resolved ingredient layers, rendered after
   * `CUP_PART_ORDER`'s fixed parts. Unlike `partOverrides` (one override
   * per fixed slot), this is a dynamic-length list — `features/composer/`
   * decides how many, this component just renders what it's given, in the
   * order given (stacking order is the caller's decision, expressed via
   * each entry's own `position`).
   */
  ingredientLayers?: ResolvedIngredientLayer[];
}

/** Ambient auto-spin while idle, in rad/s — pauses on hover, resumes after inertia settles. */
const IDLE_ROTATION_SPEED = 0.12;
/** 3D scene units, not the 2D `float` preset's pixel-based amplitude — same period, different unit space. */
const IDLE_FLOAT_AMPLITUDE = 0.06;

/**
 * Composes every cup part behind the CupPartProps contract, in
 * CUP_PART_ORDER. Owns the root transform that idle-float/rotation drive;
 * individual parts (steam) still animate independently in their own
 * useFrame. See docs/state-machine.md.
 */
export function CupAssembly({ reducedMotion, partOverrides, scale, ingredientLayers }: CupAssemblyProps) {
  const groupRef = useRef<Group>(null);
  const { state, rotationYRef, velocityRef, bind } = useCupInteractionState({ disableInertia: reducedMotion });
  // Sprint 3.4 — one simulation, owned here, read by whichever parts below
  // care (`coffee`/`foam`/`ingredient-ice`); see `useLiquidPhysics`'s doc
  // comment on why this lives at the assembly level and not per-part.
  const physicsRef = useLiquidPhysics({ velocityRef, interactionState: state, reducedMotion });

  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    if (!group) return;

    if (reducedMotion) {
      group.position.y = 0;
    } else {
      const time = clock.getElapsedTime();
      group.position.y = Math.sin((time / float.periodSeconds) * Math.PI * 2) * IDLE_FLOAT_AMPLITUDE;
    }

    if (state === "idle" && !reducedMotion) {
      rotationYRef.current += IDLE_ROTATION_SPEED * delta;
    }
    group.rotation.y = rotationYRef.current;
  });

  return (
    <group ref={groupRef} scale={scale} {...bind}>
      {CUP_PART_ORDER.map((name) => {
        const Part = resolveCupPart(name);
        const override = partOverrides?.[name];
        return (
          <Part
            key={name}
            visible={name === "steam" ? !reducedMotion : override?.visible}
            materialOverrides={override?.materialOverrides}
            physicsRef={physicsRef}
          />
        );
      })}
      {ingredientLayers?.map(({ key, partName, ...layerProps }) => {
        const Part = resolveCupPart(partName);
        return <Part key={key} {...layerProps} physicsRef={physicsRef} />;
      })}
    </group>
  );
}
