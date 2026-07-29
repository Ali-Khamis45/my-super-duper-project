"use client";

import { useMemo } from "react";

import { CupCanvasLoader } from "@/features/hero-cup/components/CupCanvasLoader";
import { useCustomizerStore } from "@/stores/customizer-store";

import { resolvePartOverrides } from "../lib/resolvePartOverrides";

/**
 * Reuses `CupCanvasLoader` directly rather than a second `next/dynamic`
 * boundary — it already keeps `three`/R3F out of the server bundle
 * internally (its own `dynamic(..., { ssr: false })` around `CupCanvas`),
 * so wrapping it again here would be redundant, not safer.
 *
 * The effective look is `selection` with any active hover/focus `preview`
 * merged on top — "Preview Before Commit": the 3D cup always reflects what
 * you're currently pointing at or focused on, not just what's committed.
 */
export function CustomizerCanvas() {
  const selection = useCustomizerStore((state) => state.selection);
  const preview = useCustomizerStore((state) => state.preview);

  const effective = useMemo(() => ({ ...selection, ...preview }), [selection, preview]);
  const { partOverrides, cupScale } = useMemo(() => resolvePartOverrides(effective), [effective]);

  return <CupCanvasLoader partOverrides={partOverrides} cupScale={cupScale} route="/customize" />;
}
