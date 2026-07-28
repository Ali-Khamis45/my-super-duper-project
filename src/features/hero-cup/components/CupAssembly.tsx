"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";

import { float } from "@/engine/motion/presets";

import { useCupInteractionState } from "../hooks/useCupInteractionState";
import { CUP_PART_ORDER, resolveCupPart } from "../registry/cupPartRegistry";

interface CupAssemblyProps {
  reducedMotion: boolean;
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
export function CupAssembly({ reducedMotion }: CupAssemblyProps) {
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
    <group ref={groupRef} {...bind}>
      {CUP_PART_ORDER.map((name) => {
        const Part = resolveCupPart(name);
        return <Part key={name} visible={name === "steam" ? !reducedMotion : undefined} />;
      })}
    </group>
  );
}
