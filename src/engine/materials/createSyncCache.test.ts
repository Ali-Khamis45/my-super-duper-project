import { describe, expect, it, vi } from "vitest";

import { createSyncCache } from "./createSyncCache";

describe("createSyncCache", () => {
  it("creates a value on first request and reuses it on subsequent requests", () => {
    const cache = createSyncCache<{ id: number }>();
    const factory = vi.fn(() => ({ id: 1 }));
    const a = cache.getOrCreate("x", factory);
    const b = cache.getOrCreate("x", factory);
    expect(a).toBe(b);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("tracks hits and misses correctly", () => {
    const cache = createSyncCache<number>();
    cache.getOrCreate("a", () => 1); // miss
    cache.getOrCreate("a", () => 1); // hit
    cache.getOrCreate("b", () => 2); // miss
    expect(cache.misses).toBe(2);
    expect(cache.hits).toBe(1);
  });

  it("has() reflects whether a key is currently cached", () => {
    const cache = createSyncCache<number>();
    expect(cache.has("a")).toBe(false);
    cache.getOrCreate("a", () => 1);
    expect(cache.has("a")).toBe(true);
  });

  it("invalidate calls the disposer and removes the entry", () => {
    const cache = createSyncCache<{ id: number }>();
    const value = cache.getOrCreate("a", () => ({ id: 1 }));
    const disposer = vi.fn();
    cache.invalidate("a", disposer);
    expect(disposer).toHaveBeenCalledWith(value);
    expect(cache.has("a")).toBe(false);
  });

  it("clear disposes every entry", () => {
    const cache = createSyncCache<number>();
    cache.getOrCreate("a", () => 1);
    cache.getOrCreate("b", () => 2);
    const disposer = vi.fn();
    cache.clear(disposer);
    expect(disposer).toHaveBeenCalledTimes(2);
    expect(cache.has("a")).toBe(false);
    expect(cache.has("b")).toBe(false);
  });

  it("evicts the least-recently-used entry once maxEntries is exceeded", () => {
    const onEvicted = vi.fn();
    const cache = createSyncCache<string>({ maxEntries: 2, onEvicted });
    cache.getOrCreate("a", () => "a");
    cache.getOrCreate("b", () => "b");
    cache.getOrCreate("c", () => "c");

    expect(onEvicted).toHaveBeenCalledWith("a", "a");
    expect(cache.has("a")).toBe(false);
    expect(cache.has("b")).toBe(true);
    expect(cache.has("c")).toBe(true);
  });

  it("re-accessing an entry protects it from being the next eviction", () => {
    const cache = createSyncCache<string>({ maxEntries: 2 });
    cache.getOrCreate("a", () => "a");
    cache.getOrCreate("b", () => "b");
    cache.getOrCreate("a", () => "a"); // touch "a" again
    cache.getOrCreate("c", () => "c");

    expect(cache.has("a")).toBe(true);
    expect(cache.has("b")).toBe(false);
  });

  it("onCreated fires only on a real miss, not on a cache hit", () => {
    const onCreated = vi.fn();
    const cache = createSyncCache<number>({ onCreated });
    cache.getOrCreate("a", () => 1);
    cache.getOrCreate("a", () => 1);
    expect(onCreated).toHaveBeenCalledTimes(1);
  });
});
