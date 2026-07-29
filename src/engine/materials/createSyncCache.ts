/**
 * The synchronous sibling of `engine/assets/createResourceManager.ts` — same
 * one-owner, LRU-capped, dispose-on-evict shape, but for values that are
 * created *synchronously* (a compiled `THREE.Material`, a canvas-generated
 * texture) rather than fetched. Deliberately a separate factory, not a
 * forced reuse of the async one: every existing cup part creates its
 * material synchronously inside `useMemo`, assigning it directly to a
 * `<mesh material={...}>` prop. Routing that through `createResourceManager`'s
 * `Promise`-returning `load()` would make material creation asynchronous
 * everywhere it's consumed — a breaking change to every part component's
 * render contract, forbidden by docs/17_ZERO_REWRITE_POLICY.md. This keeps
 * the "one owner" rule intact without paying that cost.
 */
export interface SyncCache<T> {
  getOrCreate(key: string, factory: () => T): T;
  has(key: string): boolean;
  invalidate(key: string, disposer?: (value: T) => void): void;
  clear(disposer?: (value: T) => void): void;
  readonly hits: number;
  readonly misses: number;
  /** Current entry count — the Engine Health Dashboard's "material/resource count" reading (Sprint 2.6). */
  readonly size: number;
}

export interface SyncCacheOptions<T> {
  maxEntries?: number;
  onEvicted?: (key: string, value: T) => void;
  onCreated?: (key: string, value: T) => void;
}

export function createSyncCache<T>(options: SyncCacheOptions<T> = {}): SyncCache<T> {
  const { maxEntries = 50, onEvicted, onCreated } = options;
  const entries = new Map<string, T>();
  const accessOrder: string[] = [];
  let hits = 0;
  let misses = 0;

  function touch(key: string) {
    const index = accessOrder.indexOf(key);
    if (index !== -1) accessOrder.splice(index, 1);
    accessOrder.push(key);
  }

  function evictIfOverCap() {
    while (accessOrder.length > maxEntries) {
      const oldestKey = accessOrder.shift();
      if (oldestKey === undefined) break;
      const value = entries.get(oldestKey);
      if (value !== undefined) onEvicted?.(oldestKey, value);
      entries.delete(oldestKey);
    }
  }

  return {
    getOrCreate(key, factory) {
      const existing = entries.get(key);
      if (existing !== undefined) {
        hits += 1;
        touch(key);
        return existing;
      }
      misses += 1;
      const value = factory();
      entries.set(key, value);
      touch(key);
      onCreated?.(key, value);
      evictIfOverCap();
      return value;
    },
    has(key) {
      return entries.has(key);
    },
    invalidate(key, disposer) {
      const value = entries.get(key);
      if (value !== undefined) disposer?.(value);
      entries.delete(key);
      const index = accessOrder.indexOf(key);
      if (index !== -1) accessOrder.splice(index, 1);
    },
    clear(disposer) {
      for (const [key, value] of entries) {
        disposer?.(value);
        void key;
      }
      entries.clear();
      accessOrder.length = 0;
    },
    get hits() {
      return hits;
    },
    get misses() {
      return misses;
    },
    get size() {
      return entries.size;
    },
  };
}
