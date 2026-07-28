import { useEffect, useRef } from "react";

import { normalizePointer } from "@/engine/interaction/normalizePointer";

/**
 * A mutable ref, not state — updated 60+ times/sec on pointermove and read
 * imperatively by CameraRig inside its own useFrame. Using state here would
 * force a React re-render on every mouse move for no reason.
 */
export function useMouseParallax() {
  const pointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const viewport = new DOMRect(0, 0, window.innerWidth, window.innerHeight);
      const { x, y } = normalizePointer(event.clientX, event.clientY, viewport);
      pointerRef.current.x = x;
      pointerRef.current.y = y;
    }

    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  return pointerRef;
}
