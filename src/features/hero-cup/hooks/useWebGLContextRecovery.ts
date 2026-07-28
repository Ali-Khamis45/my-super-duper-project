import type { RootState } from "@react-three/fiber";
import { useCallback, useState } from "react";

import { appEvents } from "@/engine/events";

/**
 * Distinct failure mode from "WebGL unavailable at load" (`useWebGLSupport`):
 * the GPU context can be reclaimed mid-session (another tab's GPU load, a
 * driver crash, a laptop GPU switch). Found as a real gap during
 * docs/15_ARCHITECTURE_FREEZE.md's failure-mode analysis — not previously
 * handled anywhere in this codebase. `event.preventDefault()` is required
 * by the WebGL spec to permit eventual restoration; omitting it makes the
 * loss permanent for that canvas.
 */
export function useWebGLContextRecovery() {
  const [contextLost, setContextLost] = useState(false);

  const handleCreated = useCallback((state: RootState) => {
    const canvas = state.gl.domElement;

    function handleContextLost(event: Event) {
      event.preventDefault();
      setContextLost(true);
      appEvents.emit({ name: "webgl:context-lost" });
    }

    function handleContextRestored() {
      setContextLost(false);
      appEvents.emit({ name: "webgl:context-restored" });
    }

    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);
    // Not cleaned up explicitly: `onCreated` fires once per Canvas instance
    // and these listeners live exactly as long as the canvas element does —
    // it's garbage collected with the element on unmount, same as any other
    // DOM listener on an element that's about to be removed entirely.
  }, []);

  return { contextLost, handleCreated };
}
