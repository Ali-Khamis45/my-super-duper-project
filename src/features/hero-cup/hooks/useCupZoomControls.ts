"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";

import { CAMERA_ZOOM_MAX, CAMERA_ZOOM_MIN } from "@/engine/camera/presets";
import { appEvents } from "@/engine/events";
import { useGestureRecognizer } from "@/engine/interaction/useGestureRecognizer";
import { createBridgeStore } from "@/engine/state/createBridgeStore";

/** How far a single wheel notch/keypress/button-click moves the zoom. */
const ZOOM_STEP = 0.15;
/** Wheel deltaY -> zoom-multiplier sensitivity — tuned so one typical mouse-wheel notch (~100) is close to one `ZOOM_STEP`. */
const WHEEL_SENSITIVITY = 0.0015;
/** How strongly a pinch's distance-ratio-per-frame maps to a zoom change. */
const PINCH_SENSITIVITY = 1.4;
/** "Fit to Screen" — pulled back further than any authored preset's default (1), guaranteeing the cup, its contact shadow, and the environment stay fully in frame regardless of viewport size, per the brief's own requirement. */
const FIT_TO_SCREEN_ZOOM = CAMERA_ZOOM_MAX;

interface UseCupZoomControlsOptions {
  /** The DOM element wheel/pinch/double-click listeners attach to — typically the canvas's wrapper `<div>`, not the R3F canvas itself, so these stay ordinary DOM listeners alongside (not instead of) R3F's own pointer handling. */
  targetRef: RefObject<HTMLElement | null>;
  /** The zoom level this view starts at and returns to on "Reset View". Defaults to 1 (the preset's own authored framing). */
  initialZoom?: number;
  /**
   * When true, a bare wheel over `targetRef` doesn't zoom — it's left alone
   * so the page scrolls natively — and only Ctrl/Cmd+wheel zooms. For a
   * canvas that fills the whole viewport (Hero) capturing every wheel tick
   * is correct; for one that sits beside page content the user needs to
   * scroll past to reach (Customizer's "Add to Cart", Concierge's
   * recommendation) it made that content unreachable by scroll whenever the
   * cursor happened to be over the cup — a real reported bug. Defaults to
   * false, so Hero's own existing wheel-to-zoom behavior is unchanged.
   */
  requireModifierForWheelZoom?: boolean;
}

/**
 * Sprint 3.9, Task 2 — pinch/wheel/slider/reset/fit-to-screen camera zoom,
 * built entirely as composition over what already exists: the zoom value
 * itself is a `createBridgeStore` instance (the same primitive
 * `scrollProgress`/`performanceManager.tier` already use for a continuous
 * cross-boundary value), read by `CameraRig`'s new optional `zoomSource`
 * prop; wheel handling reuses `engine/interaction/useGestureRecognizer`'s
 * new `"wheel"` gesture (this hook is its first real consumer — the
 * Interaction Manager's originally-dormant DOM-native recognizer). Pinch
 * needs two-pointer bookkeeping that recognizer's single-pointer model
 * doesn't fit, so it's tracked locally here instead of generalized into a
 * shared primitive for one caller. "No new camera implementation" — this
 * hook has no opinion about cameras at all, only about a zoom *number*.
 *
 * One bridge store per hook call, not a module-level singleton — each
 * mounted cup viewer (Hero, Customizer) gets its own independent zoom state
 * rather than bleeding across routes/instances.
 */
export function useCupZoomControls({ targetRef, initialZoom = 1, requireModifierForWheelZoom = false }: UseCupZoomControlsOptions) {
  const clampedInitial = clampZoom(initialZoom);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally created once; `initialZoom` is a mount-time-only seed, not a reactive input.
  const store = useMemo(() => createBridgeStore(clampedInitial), []);
  const initialZoomRef = useRef(clampedInitial);
  const zoom = store.useValue();

  const setZoom = useCallback(
    (next: number) => {
      const clamped = clampZoom(next);
      if (clamped === store.getValue()) return;
      store.setValue(clamped);
      appEvents.emit({ name: "camera:zoom-changed", zoom: clamped });
    },
    [store],
  );

  const zoomIn = useCallback(() => setZoom(store.getValue() - ZOOM_STEP), [setZoom, store]);
  const zoomOut = useCallback(() => setZoom(store.getValue() + ZOOM_STEP), [setZoom, store]);
  const reset = useCallback(() => setZoom(initialZoomRef.current), [setZoom]);
  const fitToScreen = useCallback(() => setZoom(FIT_TO_SCREEN_ZOOM), [setZoom]);

  useGestureRecognizer(
    targetRef,
    {
      wheel: (event) => {
        const deltaY = event.delta?.y ?? 0;
        setZoom(store.getValue() + deltaY * WHEEL_SENSITIVITY);
      },
    },
    { wheelRequiresModifier: requireModifierForWheelZoom },
  );

  // Double-click/double-tap reset, plus pinch — kept as native listeners on
  // the same target rather than folded into useGestureRecognizer: pinch's
  // two-active-pointer distance tracking is specific to this one zoom
  // interaction, not a general-purpose gesture worth generalizing yet.
  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    function handleDoubleClick() {
      reset();
    }

    const activePointers = new Map<number, { x: number; y: number }>();
    let lastPinchDistance: number | null = null;

    function distanceBetween(a: { x: number; y: number }, b: { x: number; y: number }) {
      return Math.hypot(a.x - b.x, a.y - b.y);
    }

    function handlePointerDown(event: PointerEvent) {
      if (event.pointerType !== "touch") return;
      activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (activePointers.size === 2) {
        const [a, b] = [...activePointers.values()];
        lastPinchDistance = distanceBetween(a!, b!);
      }
    }

    function handlePointerMove(event: PointerEvent) {
      if (!activePointers.has(event.pointerId)) return;
      activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (activePointers.size === 2 && lastPinchDistance !== null) {
        event.preventDefault();
        const [a, b] = [...activePointers.values()];
        const distance = distanceBetween(a!, b!);
        const ratio = distance / lastPinchDistance;
        // Fingers spreading apart (ratio > 1) reads as "zoom in" — a smaller
        // distance multiplier — so the sign is inverted relative to wheel.
        setZoom(store.getValue() - (ratio - 1) * PINCH_SENSITIVITY);
        lastPinchDistance = distance;
      }
    }

    function handlePointerUpOrCancel(event: PointerEvent) {
      activePointers.delete(event.pointerId);
      if (activePointers.size < 2) lastPinchDistance = null;
    }

    target.addEventListener("dblclick", handleDoubleClick);
    target.addEventListener("pointerdown", handlePointerDown);
    target.addEventListener("pointermove", handlePointerMove);
    target.addEventListener("pointerup", handlePointerUpOrCancel);
    target.addEventListener("pointercancel", handlePointerUpOrCancel);
    return () => {
      target.removeEventListener("dblclick", handleDoubleClick);
      target.removeEventListener("pointerdown", handlePointerDown);
      target.removeEventListener("pointermove", handlePointerMove);
      target.removeEventListener("pointerup", handlePointerUpOrCancel);
      target.removeEventListener("pointercancel", handlePointerUpOrCancel);
    };
  }, [targetRef, reset, setZoom, store]);

  return {
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
    reset,
    fitToScreen,
    zoomStore: store,
    min: CAMERA_ZOOM_MIN,
    max: CAMERA_ZOOM_MAX,
  };
}

function clampZoom(value: number): number {
  return Math.min(CAMERA_ZOOM_MAX, Math.max(CAMERA_ZOOM_MIN, value));
}
