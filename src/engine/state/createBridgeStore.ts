import { create } from "zustand";

/**
 * Generalizes a pattern Milestone 1 solved three times independently: a
 * value written on one side of a DOM/R3F boundary needs to be read on the
 * other, without forcing a React re-render on every write. See
 * docs/04_MOTION_ENGINE.md.
 */
export interface BridgeStore<T> {
  /** Reactive read — subscribes and re-renders on change. DOM/Framer Motion side. */
  useValue: () => T;
  /** Imperative read — no subscription. `useFrame`/other non-React consumers. */
  getValue: () => T;
  setValue: (value: T) => void;
}

export function createBridgeStore<T>(initial: T): BridgeStore<T> {
  const store = create<{ value: T }>(() => ({ value: initial }));
  return {
    useValue: () => store((s) => s.value),
    getValue: () => store.getState().value,
    setValue: (value: T) => store.setState({ value }),
  };
}
