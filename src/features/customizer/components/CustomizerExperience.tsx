"use client";

import { useEffect } from "react";

import { appEvents } from "@/engine/events";

import { CustomizerCanvas } from "./CustomizerCanvas";
import { CustomizerPanel } from "./CustomizerPanel";

/**
 * Stacked on mobile (canvas on top, panel scrolls below — both real,
 * usable content, not a drawer/sheet added just to hide the panel), side
 * by side from `lg`. The canvas's wrapping div needs a real height for
 * `CupCanvas`'s own `h-full` to resolve against — `flex-1` inside this
 * `min-h-screen` flex container provides it at both breakpoints.
 */
export function CustomizerExperience() {
  useEffect(() => {
    appEvents.emit({ name: "customizer:opened" });
    return () => appEvents.emit({ name: "customizer:closed" });
  }, []);

  return (
    <div id="main-content" className="flex min-h-screen flex-col pt-20 lg:flex-row lg:pt-24">
      <div className="relative h-[55vh] w-full lg:h-auto lg:flex-1">
        <CustomizerCanvas />
      </div>
      <aside className="border-border w-full border-t lg:h-auto lg:w-96 lg:border-t-0 lg:border-l">
        <CustomizerPanel />
      </aside>
    </div>
  );
}
