/**
 * Frozen in docs/12_INTERACTION_SYSTEM.md, reconciled with
 * docs/22_MANAGER_INTERFACES.md during RC0 (an earlier draft of that doc had
 * drifted to a different, incompatible shape — see docs/27_RC0_APPROVAL.md).
 * This file is the single source of truth both docs now point back to.
 */
export type GestureType =
  | "tap"
  | "drag-start"
  | "drag-move"
  | "drag-end"
  | "hover-start"
  | "hover-end"
  | "press-hold";

export type PointerKind = "mouse" | "touch" | "pen" | "keyboard" | "gamepad";

export interface GestureEvent {
  type: GestureType;
  pointerKind: PointerKind;
  /** Normalized [-1, 1], via engine/interaction/normalizePointer. */
  position: { x: number; y: number };
  /** Present on drag-move; raw pixel delta since the last event. */
  delta?: { x: number; y: number };
  /** Present for pen input when the browser reports it; unused until a pressure-sensitive interaction needs it. */
  pressure?: number;
}

/** Classifies a native PointerEvent's `pointerType` into the closed PointerKind vocabulary. */
export function classifyPointerKind(pointerType: string): PointerKind {
  if (pointerType === "touch") return "touch";
  if (pointerType === "pen") return "pen";
  return "mouse";
}
