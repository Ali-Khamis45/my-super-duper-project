"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { track } from "@/engine/analytics/tracking";
import { useIsClient } from "@/hooks/useIsClient";

/**
 * Renders a stable placeholder until mounted — next-themes can't know the
 * resolved theme during SSR, and guessing would cause a hydration mismatch.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useIsClient();

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={mounted ? (isDark ? "Switch to light theme" : "Switch to dark theme") : "Toggle theme"}
      onClick={() => {
        const next = isDark ? "light" : "dark";
        setTheme(next);
        track({ name: "theme_toggled", payload: { theme: next } });
      }}
    >
      {mounted ? (
        isDark ? (
          <Sun className="size-4" aria-hidden="true" />
        ) : (
          <Moon className="size-4" aria-hidden="true" />
        )
      ) : (
        <Sun className="size-4 opacity-0" aria-hidden="true" />
      )}
    </Button>
  );
}
