"use client";

import dynamic from "next/dynamic";

import { CupStaticFallback } from "./CupStaticFallback";

// `ssr: false` is only permitted inside a Client Component in Next.js 16 —
// this thin wrapper exists so Hero.tsx can stay a Server Component while
// still keeping `three`/R3F out of the server bundle entirely.
const CupCanvas = dynamic(() => import("./CupCanvas"), {
  ssr: false,
  loading: () => <CupStaticFallback />,
});

export function CupCanvasLoader() {
  return <CupCanvas />;
}
