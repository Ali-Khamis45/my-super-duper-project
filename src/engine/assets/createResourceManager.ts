/**
 * The generic resource-lifecycle factory every asset pipeline (GLB, texture,
 * HDR) instantiates — one convention, multiple applications, same pattern
 * as `createPartRegistry`/`createBridgeStore`/`createEventBus`. Fulfills
 * both "Resource Registry" (lifecycle state per key) and "Asset Cache"
 * (the loaded value, deduped by key) — one internal structure serving both
 * named responsibilities, not two redundant ones.
 *
 * Ownership rule (docs/16_ENGINEERING_SPRINTS.md Sprint 2.2): every
 * resource has exactly one owner. This factory *is* that owner for
 * whichever pipeline instantiates it — loading, caching, disposal,
 * recovery, and eviction all happen here, in one place, never split across
 * call sites. Other code reads via `get()`/`load()`; nothing else disposes
 * a resource this manager owns.
 */

export type ResourceState = "unregistered" | "loading" | "ready" | "error";

export interface ResourceEntry<T> {
  state: ResourceState;
  value: T | null;
  error: string | null;
}

export interface ResourceManagerOptions<T> {
  /** Load races against this timeout; exceeding it is treated as a failure. */
  timeoutMs?: number;
  /** LRU cap — the least-recently-accessed entry is evicted (and disposed) past this count. */
  maxEntries?: number;
  /** Called when the LRU cap evicts a still-ready entry (not on explicit dispose/unload). */
  onEvicted?: (key: string, value: T) => void;
  /** Called whenever a value is released — explicit dispose, unload, eviction, or hot-replacement of the old value. */
  onDisposed?: (key: string, value: T) => void;
}

export interface ResourceManager<T> {
  /**
   * Registers and loads if not already known; returns the cached value
   * immediately (no reload) if already `"ready"`; joins the in-flight
   * promise if already `"loading"` (concurrent calls for the same key never
   * start a second load).
   */
  load(key: string, loader: () => Promise<T>): Promise<T>;
  /** Re-attempts a load for a key currently in `"error"` state. */
  retry(key: string, loader: () => Promise<T>): Promise<T>;
  /** Loads without the caller awaiting the result — the streaming/preload primitive. Failures are logged, not thrown at the call site. */
  preload(key: string, loader: () => Promise<T>): void;
  /** Replaces an already-ready value with a newly loaded one, disposing the old value once the new one is ready — hot replacement. */
  replace(key: string, loader: () => Promise<T>): Promise<T>;
  get(key: string): ResourceEntry<T> | undefined;
  /** Releases a resource's value (calling the provided disposer) and removes it from the registry. */
  dispose(key: string, disposer?: (value: T) => void): void;
  /** Disposes every entry and clears the registry — e.g. leaving a route that owns these resources. */
  clear(disposer?: (value: T) => void): void;
}

export function createResourceManager<T>(options: ResourceManagerOptions<T> = {}): ResourceManager<T> {
  const { timeoutMs = 10_000, maxEntries = 50, onEvicted, onDisposed } = options;
  const entries = new Map<string, ResourceEntry<T>>();
  const inFlight = new Map<string, Promise<T>>();
  const accessOrder: string[] = []; // oldest first; touched on every get/load

  function touch(key: string) {
    const index = accessOrder.indexOf(key);
    if (index !== -1) accessOrder.splice(index, 1);
    accessOrder.push(key);
  }

  function evictIfOverCap() {
    while (accessOrder.length > maxEntries) {
      const oldestKey = accessOrder.shift();
      if (oldestKey === undefined) break;
      const entry = entries.get(oldestKey);
      if (entry?.state === "ready" && entry.value !== null) {
        onEvicted?.(oldestKey, entry.value);
        onDisposed?.(oldestKey, entry.value);
      }
      entries.delete(oldestKey);
    }
  }

  async function runLoad(key: string, loader: () => Promise<T>): Promise<T> {
    entries.set(key, { state: "loading", value: null, error: null });

    const timeout = new Promise<never>((_resolve, reject) => {
      setTimeout(() => reject(new Error(`Resource "${key}" timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    try {
      const value = await Promise.race([loader(), timeout]);
      entries.set(key, { state: "ready", value, error: null });
      touch(key);
      evictIfOverCap();
      return value;
    } catch (error) {
      entries.set(key, { state: "error", value: null, error: error instanceof Error ? error.message : String(error) });
      throw error;
    } finally {
      inFlight.delete(key);
    }
  }

  function load(key: string, loader: () => Promise<T>): Promise<T> {
    const existing = entries.get(key);
    if (existing?.state === "ready" && existing.value !== null) {
      touch(key);
      return Promise.resolve(existing.value);
    }
    const pending = inFlight.get(key);
    if (pending) return pending;

    const promise = runLoad(key, loader);
    inFlight.set(key, promise);
    return promise;
  }

  function retry(key: string, loader: () => Promise<T>): Promise<T> {
    inFlight.delete(key);
    entries.delete(key);
    return load(key, loader);
  }

  function preload(key: string, loader: () => Promise<T>): void {
    load(key, loader).catch((error: unknown) => {
      console.error(`[ResourceManager] preload of "${key}" failed:`, error);
    });
  }

  async function replace(key: string, loader: () => Promise<T>): Promise<T> {
    const previous = entries.get(key);
    inFlight.delete(key);
    const value = await runLoad(key, loader);
    if (previous?.state === "ready" && previous.value !== null && previous.value !== value) {
      onDisposed?.(key, previous.value);
    }
    return value;
  }

  function get(key: string): ResourceEntry<T> | undefined {
    return entries.get(key);
  }

  function dispose(key: string, disposer?: (value: T) => void): void {
    const entry = entries.get(key);
    if (entry?.state === "ready" && entry.value !== null) {
      disposer?.(entry.value);
      onDisposed?.(key, entry.value);
    }
    entries.delete(key);
    inFlight.delete(key);
    const index = accessOrder.indexOf(key);
    if (index !== -1) accessOrder.splice(index, 1);
  }

  function clear(disposer?: (value: T) => void): void {
    for (const key of Array.from(entries.keys())) {
      dispose(key, disposer);
    }
  }

  return { load, retry, preload, replace, get, dispose, clear };
}
