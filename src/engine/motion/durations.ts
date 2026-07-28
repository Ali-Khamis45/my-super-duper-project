import { durationMs } from "@/design-system/tokens/motion";

/** Framer Motion durations are in seconds; tokens.css durations are in ms. */
export const durations = {
  fast: durationMs.fast / 1000,
  base: durationMs.base / 1000,
  slow: durationMs.slow / 1000,
} as const;
