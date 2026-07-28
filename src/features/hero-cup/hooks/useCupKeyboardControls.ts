import type { KeyboardEvent } from "react";

import { createBridgeStore } from "@/engine/state/createBridgeStore";

/**
 * Drag-to-rotate has no keyboard equivalent otherwise — a keyboard-only
 * user could see the cup (idle auto-rotate still plays) but never steer it.
 * The keydown source (a focusable DOM element on the Canvas, outside the
 * R3F tree) and the consumer (rotationYRef inside useCupInteractionState,
 * inside the R3F tree) can't share React state directly across that
 * boundary — this store's read is destructive by design (drained and reset
 * each frame), unlike every other bridge store, since it's a delta queue,
 * not a level value. See docs/18_ENGINEERING_CONTRACTS.md.
 */
const KEYBOARD_ROTATION_STEP = 0.12;

const keyboardRotationDelta = createBridgeStore(0);

/** Bind to a focusable element (e.g. the Canvas) so arrow keys only rotate the cup when it has focus. */
export function useCupKeyboardTrigger() {
  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      keyboardRotationDelta.setValue(keyboardRotationDelta.getValue() - KEYBOARD_ROTATION_STEP);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      keyboardRotationDelta.setValue(keyboardRotationDelta.getValue() + KEYBOARD_ROTATION_STEP);
    }
  }

  return { onKeyDown };
}

/** Called once per frame by useCupInteractionState; returns and clears any pending keyboard rotation. */
export function drainKeyboardRotation(): number {
  const pendingDelta = keyboardRotationDelta.getValue();
  if (pendingDelta !== 0) {
    keyboardRotationDelta.setValue(0);
  }
  return pendingDelta;
}
