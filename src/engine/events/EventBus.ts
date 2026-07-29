/**
 * Internal, typed, synchronous cross-manager coordination — distinct from
 * `engine/analytics` (external reporting, allowed to be async, allowed to
 * drop under sink backpressure). See docs/18_ENGINEERING_CONTRACTS.md's
 * Review section for why the two are never the same mechanism.
 *
 * Contract, frozen in docs/19_EVENT_CATALOG.md:
 * - Synchronous, in-subscription-order — `emit` calls every current listener
 *   before returning; no queue, no microtask deferral.
 * - A throwing listener is caught and logged; it never prevents later
 *   listeners from running and never propagates to the emitter.
 * - No replay — a listener added after an event fired never receives it.
 *   Anything needing "the current value, even for a late subscriber" is a
 *   bridge store (continuous state), never an event.
 */
type Listener<TEvent> = (event: TEvent) => void;

export interface EventBus<TEvent extends { name: string }> {
  emit(event: TEvent): void;
  on<TName extends TEvent["name"]>(
    name: TName,
    listener: Listener<Extract<TEvent, { name: TName }>>,
  ): () => void;
  /** Total `emit()` calls since this bus was created — a monotonic counter, not a rate. The Engine Health Dashboard's "event throughput" (Sprint 2.6) derives events/sec from the delta between two samples, the same pattern `PerformanceSampler` already uses for FPS. Additive: existing consumers of the frozen `emit`/`on` contract are unaffected. */
  getEmitCount(): number;
}

export function createEventBus<TEvent extends { name: string }>(): EventBus<TEvent> {
  const listenersByName = new Map<TEvent["name"], Set<Listener<TEvent>>>();
  let emitCount = 0;

  return {
    emit(event) {
      emitCount += 1;
      const listeners = listenersByName.get(event.name);
      if (!listeners) return;
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          console.error(`[EventBus] listener for "${event.name}" threw:`, error);
        }
      }
    },
    getEmitCount() {
      return emitCount;
    },
    on(name, listener) {
      const typedListener = listener as Listener<TEvent>;
      const listeners = listenersByName.get(name) ?? new Set<Listener<TEvent>>();
      listeners.add(typedListener);
      listenersByName.set(name, listeners);
      return () => {
        listeners.delete(typedListener);
      };
    },
  };
}
