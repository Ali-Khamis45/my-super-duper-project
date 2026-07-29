"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";

import { float } from "@/engine/motion/presets";

import { useCupInteractionState } from "../hooks/useCupInteractionState";
import { CUP_PART_ORDER, resolveCupPart } from "../registry/cupPartRegistry";
import type { CupPartName, CupPartProps } from "../registry/types";

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
export function CupAssembly({ reducedMotion, partOverrides, scale }: CupAssemblyProps) {
  const groupRef = useRef<Group>(null);
  const { state, rotationYRef, bind } = useCupInteractionState({ disableInertia: reducedMotion });

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
          />
        );
      })}
    </group>
  );
}
