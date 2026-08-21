import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useGestureRecognizer } from "./useGestureRecognizer";
import type { GestureEvent, GestureType } from "./types";

function firePointer(
  target: EventTarget,
  type: string,
  init: Partial<PointerEventInit> & { clientX: number; clientY: number },
) {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerType: "mouse",
      ...init,
    }),
  );
}

describe("useGestureRecognizer", () => {
  let element: HTMLDivElement;

  beforeEach(() => {
    element = document.createElement("div");
    document.body.appendChild(element);
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      right: 100,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
  });

  afterEach(() => {
    element.remove();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function setup(handlers: Partial<Record<GestureType, (event: GestureEvent) => void>>, options?: { wheelRequiresModifier?: boolean }) {
    const ref = { current: element };
    renderHook(() => useGestureRecognizer(ref, handlers, options));
  }

  it("emits hover-start and hover-end on pointerenter/pointerleave", () => {
    const onHoverStart = vi.fn();
    const onHoverEnd = vi.fn();
    setup({ "hover-start": onHoverStart, "hover-end": onHoverEnd });

    firePointer(element, "pointerenter", { clientX: 50, clientY: 50 });
    expect(onHoverStart).toHaveBeenCalledTimes(1);
    expect(onHoverStart).toHaveBeenCalledWith(expect.objectContaining({ pointerKind: "mouse" }));

    firePointer(element, "pointerleave", { clientX: 50, clientY: 50 });
    expect(onHoverEnd).toHaveBeenCalledTimes(1);
  });

  it("a small pointer movement below the drag threshold produces a tap, not a drag", () => {
    const onTap = vi.fn();
    const onDragStart = vi.fn();
    setup({ tap: onTap, "drag-start": onDragStart });

    firePointer(element, "pointerdown", { clientX: 10, clientY: 10 });
    firePointer(window, "pointermove", { clientX: 11, clientY: 10 });
    firePointer(window, "pointerup", { clientX: 11, clientY: 10 });

    expect(onDragStart).not.toHaveBeenCalled();
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it("movement past the drag threshold produces drag-start, drag-move, then drag-end — never a tap", () => {
    const onTap = vi.fn();
    const onDragStart = vi.fn();
    const onDragMove = vi.fn();
    const onDragEnd = vi.fn();
    setup({ tap: onTap, "drag-start": onDragStart, "drag-move": onDragMove, "drag-end": onDragEnd });

    firePointer(element, "pointerdown", { clientX: 10, clientY: 10 });
    firePointer(window, "pointermove", { clientX: 30, clientY: 10 });
    firePointer(window, "pointerup", { clientX: 30, clientY: 10 });

    expect(onDragStart).toHaveBeenCalledTimes(1);
    expect(onDragMove).toHaveBeenCalledTimes(1);
    expect(onDragMove).toHaveBeenCalledWith(expect.objectContaining({ delta: { x: 20, y: 0 } }));
    expect(onDragEnd).toHaveBeenCalledTimes(1);
    expect(onTap).not.toHaveBeenCalled();
  });

  it("classifies touch input as pointerKind 'touch'", () => {
    const onTap = vi.fn();
    setup({ tap: onTap });

    firePointer(element, "pointerdown", { clientX: 10, clientY: 10, pointerType: "touch" });
    firePointer(window, "pointerup", { clientX: 10, clientY: 10, pointerType: "touch" });

    expect(onTap).toHaveBeenCalledWith(expect.objectContaining({ pointerKind: "touch" }));
  });

  it("emits press-hold after the hold duration if the pointer never moves or releases", () => {
    vi.useFakeTimers();
    const onPressHold = vi.fn();
    setup({ "press-hold": onPressHold });

    firePointer(element, "pointerdown", { clientX: 10, clientY: 10 });
    vi.advanceTimersByTime(600);

    expect(onPressHold).toHaveBeenCalledTimes(1);
  });

  it("does not emit press-hold if the pointer releases before the hold duration", () => {
    vi.useFakeTimers();
    const onPressHold = vi.fn();
    setup({ "press-hold": onPressHold });

    firePointer(element, "pointerdown", { clientX: 10, clientY: 10 });
    vi.advanceTimersByTime(100);
    firePointer(window, "pointerup", { clientX: 10, clientY: 10 });
    vi.advanceTimersByTime(600);

    expect(onPressHold).not.toHaveBeenCalled();
  });

  it("dispatches wheel and prevents default by default (no wheelRequiresModifier)", () => {
    const onWheel = vi.fn();
    setup({ wheel: onWheel });

    const event = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 100 });
    element.dispatchEvent(event);

    expect(onWheel).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it("wheelRequiresModifier: a bare wheel is left alone for the page to scroll natively", () => {
    const onWheel = vi.fn();
    setup({ wheel: onWheel }, { wheelRequiresModifier: true });

    const event = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 100 });
    element.dispatchEvent(event);

    expect(onWheel).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("wheelRequiresModifier: Ctrl+wheel still zooms", () => {
    const onWheel = vi.fn();
    setup({ wheel: onWheel }, { wheelRequiresModifier: true });

    const event = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 100, ctrlKey: true });
    element.dispatchEvent(event);

    expect(onWheel).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });
});
