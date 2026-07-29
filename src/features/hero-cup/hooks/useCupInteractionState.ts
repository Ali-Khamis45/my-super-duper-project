import type { ThreeEvent } from "@react-three/fiber";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";

import { appEvents } from "@/engine/events";
import { classifyPointerKind } from "@/engine/interaction/types";

import { drainKeyboardRotation } from "./useCupKeyboardControls";

/**
 * Idle -> Hover -> Drag -> Release -> Rotate (inertia) -> Idle.
 * See docs/state-machine.md. Replaces scattered boolean flags with one
 * explicit machine that CupAssembly/CupScene read to decide which
 * animation (idle-float, parallax, drag response) is active.
 *
 * Deliberately does NOT consume `engine/interaction/useGestureRecognizer` —
 * the cup is hit-tested by R3F's raycaster on a `<group>` (ThreeEvent
 * handlers), not a DOM element, so that hook's `RefObject<HTMLElement>`
 * shape doesn't fit. This hook speaks the same `GestureType`/`PointerKind`
 * vocabulary and emits the same coarse EventBus signals instead — see
 * docs/27_RC0_APPROVAL.md and this sprint's retrospective.
 */
export type CupInteractionState = "idle" | "hover" | "drag" | "rotate";

const DRAG_SENSITIVITY = 0.01;
const INERTIA_DAMPING = 0.94;
const INERTIA_STOP_THRESHOLD = 0.0015;
const RELEASE_VELOCITY_THRESHOLD = 0.02;
const RADIANS_TO_DEGREES = 180 / Math.PI;

interface UseCupInteractionStateOptions {
  /** When true (reduced motion), releasing a drag stops immediately instead of coasting. */
  disableInertia?: boolean;
}

export function useCupInteractionState({ disableInertia = false }: UseCupInteractionStateOptions = {}) {
  const [state, setState] = useState<CupInteractionState>("idle");
  const rotationYRef = useRef(0);
  const velocityRef = useRef(0);
  const lastPointerXRef = useRef(0);
  const lastMoveTimeRef = useRef(0);
  const pointerTypeRef = useRef<"drag" | "touch">("drag");
  const hoverStartTimeRef = useRef(0);
  const dragStartTimeRef = useRef(0);
  const dragStartRotationRef = useRef(0);
  const invalidate = useThree((s) => s.invalidate);

  const handlePointerEnter = useCallback((event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setState((current) => {
      if (current !== "idle") return current;
      hoverStartTimeRef.current = performance.now();
      appEvents.emit({
        name: "interaction:started",
        gesture: "hover-start",
        pointerKind: classifyPointerKind(event.nativeEvent.pointerType),
      });
      return "hover";
    });
  }, []);

  const handlePointerLeave = useCallback((event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setState((current) => {
      if (current !== "hover") return current;
      appEvents.emit({
        name: "interaction:ended",
        gesture: "hover-end",
        durationMs: performance.now() - hoverStartTimeRef.current,
      });
      return "idle";
    });
  }, []);

  const handlePointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      lastPointerXRef.current = event.clientX;
      lastMoveTimeRef.current = performance.now();
      dragStartTimeRef.current = performance.now();
      dragStartRotationRef.current = rotationYRef.current;
      velocityRef.current = 0;
      pointerTypeRef.current = event.nativeEvent.pointerType === "touch" ? "touch" : "drag";
      appEvents.emit({
        name: "interaction:started",
        gesture: "drag-start",
        pointerKind: classifyPointerKind(event.nativeEvent.pointerType),
      });
      setState("drag");
    },
    [],
  );

  useEffect(() => {
    if (state !== "drag") return;

    function handlePointerMove(event: PointerEvent) {
      const now = performance.now();
      const framesElapsed = Math.max((now - lastMoveTimeRef.current) / 16.6667, 0.5);
      const dx = event.clientX - lastPointerXRef.current;
      const delta = dx * DRAG_SENSITIVITY;

      rotationYRef.current += delta;
      velocityRef.current = delta / framesElapsed;
      lastPointerXRef.current = event.clientX;
      lastMoveTimeRef.current = now;
      // Under frameloop="demand" (reduced motion), mutating a ref doesn't
      // schedule a repaint on its own — drag must stay responsive regardless
      // (direct manipulation, never gated), so force one.
      invalidate();
    }

    function handlePointerUp() {
      const shouldCoast = !disableInertia && Math.abs(velocityRef.current) > RELEASE_VELOCITY_THRESHOLD;
      setState(shouldCoast ? "rotate" : "idle");
      if (!shouldCoast) velocityRef.current = 0;

      const degrees = (rotationYRef.current - dragStartRotationRef.current) * RADIANS_TO_DEGREES;
      appEvents.emit({
        name: "interaction:ended",
        gesture: "drag-end",
        durationMs: performance.now() - dragStartTimeRef.current,
      });
      appEvents.emit({ name: "cup:rotated", degrees, method: pointerTypeRef.current });
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [state, disableInertia, invalidate]);

  useFrame(() => {
    const keyboardDelta = drainKeyboardRotation();
    if (keyboardDelta !== 0) {
      rotationYRef.current += keyboardDelta;
      appEvents.emit({ name: "cup:rotated", degrees: keyboardDelta * RADIANS_TO_DEGREES, method: "keyboard" });
      invalidate();
    }

    if (state !== "rotate") return;
    rotationYRef.current += velocityRef.current;
    velocityRef.current *= INERTIA_DAMPING;
    if (Math.abs(velocityRef.current) < INERTIA_STOP_THRESHOLD) {
      velocityRef.current = 0;
      setState("idle");
    }
  });

  return {
    state,
    rotationYRef,
    bind: {
      onPointerEnter: handlePointerEnter,
      onPointerLeave: handlePointerLeave,
      onPointerDown: handlePointerDown,
    },
  };
}
