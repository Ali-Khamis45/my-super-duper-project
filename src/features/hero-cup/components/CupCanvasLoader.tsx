"use client";

import dynamic from "next/dynamic";

import type { CupPartName, CupPartProps } from "../registry/types";
import { CupStaticFallback } from "./CupStaticFallback";

// `ssr: false` is only permitted inside a Client Component in Next.js 16 —
// this thin wrapper exists so Hero.tsx can stay a Server Component while
// still keeping `three`/R3F out of the server bundle entirely.
const CupCanvas = dynamic(() => import("./CupCanvas"), {
  ssr: false,
  loading: () => <CupStaticFallback />,
});

interface CupCanvasLoaderProps {
  /** Sprint 3.2 — `features/customizer/` is this prop's first real caller; the Hero route passes nothing, unchanged. */
  partOverrides?: Partial<Record<CupPartName, CupPartProps>>;
  cupScale?: number;
  route?: string;
}

export function CupCanvasLoader({ partOverrides, cupScale, route }: CupCanvasLoaderProps = {}) {
  return <CupCanvas partOverrides={partOverrides} cupScale={cupScale} route={route} />;
}
