import { useTheme } from "next-themes";

import { useIsClient } from "@/hooks/useIsClient";

export type ThemeName = "light" | "dark";

/**
 * The active theme for non-DOM consumers (the 3D scene, canvas-based UI).
 * Stable "light" default before hydration — matches the DOM's own
 * pre-hydration state, so there's nothing to reconcile once the client
 * takes over.
 */
export function useActiveTheme(): ThemeName {
  const { resolvedTheme } = useTheme();
  const isClient = useIsClient();
  if (!isClient) return "light";
  return resolvedTheme === "dark" ? "dark" : "light";
}
