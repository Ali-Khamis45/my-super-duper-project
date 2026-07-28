import { useMotionValue, useSpring } from "framer-motion";
import type { PointerEvent } from "react";

import { normalizePointer } from "@/engine/interaction/normalizePointer";

import { springs } from "./springs";

/** A pointer-following pull toward the cursor, within `strength` of the element's size. */
export function useMagnetic(strength = 0.35) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, springs.snappy);
  const springY = useSpring(y, springs.snappy);

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const pointer = normalizePointer(event.clientX, event.clientY, rect);
    x.set(pointer.x * rect.width * 0.5 * strength);
    y.set(pointer.y * rect.height * 0.5 * strength);
  }

  function onPointerLeave() {
    x.set(0);
    y.set(0);
  }

  return { style: { x: springX, y: springY }, onPointerMove, onPointerLeave };
}

/** A pointer-driven 3D tilt, clamped to +/- `maxTiltDeg`. */
export function useTilt(maxTiltDeg = 8) {
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springRotateX = useSpring(rotateX, springs.snappy);
  const springRotateY = useSpring(rotateY, springs.snappy);

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const pointer = normalizePointer(event.clientX, event.clientY, rect);
    rotateY.set(pointer.x * maxTiltDeg);
    rotateX.set(pointer.y * -maxTiltDeg);
  }

  function onPointerLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return {
    style: {
      rotateX: springRotateX,
      rotateY: springRotateY,
      transformPerspective: 800,
    },
    onPointerMove,
    onPointerLeave,
  };
}
