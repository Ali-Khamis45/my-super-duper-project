import { useEffect, useRef } from "react";
import type { RefObject } from "react";

import { normalizePointer } from "./normalizePointer";
import { classifyPointerKind, type GestureEvent, type GestureType } from "./types";

/** Below this many pixels of movement, a pointer-down+up is a tap, not a drag. */
const DRAG_START_THRESHOLD_PX = 4;
const PRESS_HOLD_MS = 500;

/**
 * Recognizes gestures on a DOM element via the Pointer Events API — the
 * genuinely DOM-native half of the Interaction Manager (docs/12_INTERACTION_SYSTEM.md).
 * `useCupInteractionState` intentionally does NOT consume this directly: the
 * cup is hit-tested by R3F's raycaster on a `<group>`, not a DOM element, so
 * forcing it through a `RefObject<HTMLElement>`-shaped API would be the
 * wrong abstraction — it speaks the same `GestureEvent`/`GestureType`
 * vocabulary instead. This hook is for genuinely DOM-native future targets
 * (e.g. a future 2D customizer control). See docs/27_RC0_APPROVAL.md and
 * this sprint's retrospective for the full reasoning.
 */
export function useGestureRecognizer(
  targetRef: RefObject<HTMLElement | null>,
  handlers: Partial<Record<GestureType, (event: GestureEvent) => void>>,
) {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    let isDown = false;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let pressHoldTimer: ReturnType<typeof setTimeout> | null = null;

    function buildPosition(clientX: number, clientY: number) {
      return normalizePointer(clientX, clientY, target!.getBoundingClientRect());
    }

    function dispatch(type: GestureType, event: GestureEvent) {
      handlersRef.current[type]?.(event);
    }

    function handlePointerEnter(event: PointerEvent) {
      dispatch("hover-start", {
        type: "hover-start",
        pointerKind: classifyPointerKind(event.pointerType),
        position: buildPosition(event.clientX, event.clientY),
      });
    }

    function handlePointerLeave(event: PointerEvent) {
      dispatch("hover-end", {
        type: "hover-end",
        pointerKind: classifyPointerKind(event.pointerType),
        position: buildPosition(event.clientX, event.clientY),
      });
    }

    function handlePointerDown(event: PointerEvent) {
      isDown = true;
      isDragging = false;
      startX = event.clientX;
      startY = event.clientY;
      lastX = event.clientX;
      lastY = event.clientY;

      pressHoldTimer = setTimeout(() => {
        if (isDown && !isDragging) {
          dispatch("press-hold", {
            type: "press-hold",
            pointerKind: classifyPointerKind(event.pointerType),
            position: buildPosition(event.clientX, event.clientY),
          });
        }
      }, PRESS_HOLD_MS);

      window.addEventListener("pointermove", handleWindowPointerMove);
      window.addEventListener("pointerup", handleWindowPointerUp);
    }

    function handleWindowPointerMove(event: PointerEvent) {
      if (!isDown) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;

      if (!isDragging) {
        if (Math.hypot(dx, dy) < DRAG_START_THRESHOLD_PX) return;
        isDragging = true;
        if (pressHoldTimer) clearTimeout(pressHoldTimer);
        dispatch("drag-start", {
          type: "drag-start",
          pointerKind: classifyPointerKind(event.pointerType),
          position: buildPosition(startX, startY),
        });
      }

      dispatch("drag-move", {
        type: "drag-move",
        pointerKind: classifyPointerKind(event.pointerType),
        position: buildPosition(event.clientX, event.clientY),
        delta: { x: event.clientX - lastX, y: event.clientY - lastY },
      });
      lastX = event.clientX;
      lastY = event.clientY;
    }

    function handleWindowPointerUp(event: PointerEvent) {
      if (pressHoldTimer) clearTimeout(pressHoldTimer);

      if (isDragging) {
        dispatch("drag-end", {
          type: "drag-end",
          pointerKind: classifyPointerKind(event.pointerType),
          position: buildPosition(event.clientX, event.clientY),
        });
      } else if (isDown) {
        dispatch("tap", {
          type: "tap",
          pointerKind: classifyPointerKind(event.pointerType),
          position: buildPosition(event.clientX, event.clientY),
        });
      }

      isDown = false;
      isDragging = false;
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
    }

    target.addEventListener("pointerenter", handlePointerEnter);
    target.addEventListener("pointerleave", handlePointerLeave);
    target.addEventListener("pointerdown", handlePointerDown);

    return () => {
      target.removeEventListener("pointerenter", handlePointerEnter);
      target.removeEventListener("pointerleave", handlePointerLeave);
      target.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      if (pressHoldTimer) clearTimeout(pressHoldTimer);
    };
  }, [targetRef]);
}
