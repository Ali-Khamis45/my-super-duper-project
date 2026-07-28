import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * True only after hydration. Prefer this over `useEffect` + `setState` for
 * SSR-safe client checks — `useSyncExternalStore` avoids the extra render
 * pass an effect-driven setState would trigger.
 */
export function useIsClient() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
