"use client";

import { useEffect } from "react";

import { useAuthStore } from "@/stores/auth-store";

/**
 * Mounted once at the app root (`Providers`) — attempts a silent refresh against the HttpOnly
 * refresh cookie on load, since the in-memory access token is gone after any full page reload.
 * Renders nothing; a pure side-effect component, matching `engine/analytics/eventBridge`'s own
 * "activated at the app root, not by whichever feature happens to need it first" precedent.
 */
export function AuthSessionRestorer() {
  const restore = useAuthStore((state) => state.restore);
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    if (status === "idle") {
      void restore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
