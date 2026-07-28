import { describe, expect, it, vi } from "vitest";

import { createResourceManager } from "./createResourceManager";

describe("createResourceManager", () => {
  it("loads a resource and reports it ready", async () => {
    const manager = createResourceManager<string>();
    const value = await manager.load("a", () => Promise.resolve("loaded-a"));
    expect(value).toBe("loaded-a");
    expect(manager.get("a")).toEqual({ state: "ready", value: "loaded-a", error: null });
  });

  it("reports loading state synchronously before the loader resolves", () => {
    const manager = createResourceManager<string>();
    let resolveLoader: (value: string) => void = () => {};
    void manager.load("a", () => new Promise((resolve) => { resolveLoader = resolve; }));
    expect(manager.get("a")?.state).toBe("loading");
    resolveLoader("done");
  });

  it("a second load() for a ready key returns the cached value without calling the loader again", async () => {
    const manager = createResourceManager<string>();
    const loader = vi.fn(() => Promise.resolve("value"));
    await manager.load("a", loader);
    await manager.load("a", loader);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("concurrent load() calls for the same in-flight key join the same promise, not a second load", async () => {
    const manager = createResourceManager<string>();
    const loader = vi.fn(() => Promise.resolve("value"));
    const [a, b] = await Promise.all([manager.load("x", loader), manager.load("x", loader)]);
    expect(a).toBe("value");
    expect(b).toBe("value");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("a rejected loader puts the resource in error state and rejects the caller", async () => {
    const manager = createResourceManager<string>();
    await expect(manager.load("a", () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    expect(manager.get("a")).toEqual({ state: "error", value: null, error: "boom" });
  });

  it("a loader that never resolves times out and puts the resource in error state", async () => {
    const manager = createResourceManager<string>({ timeoutMs: 20 });
    await expect(manager.load("a", () => new Promise(() => {}))).rejects.toThrow(/timed out/);
    expect(manager.get("a")?.state).toBe("error");
  });

  it("retry re-attempts a failed load and can succeed", async () => {
    const manager = createResourceManager<string>();
    await expect(manager.load("a", () => Promise.reject(new Error("first failure")))).rejects.toThrow();
    const value = await manager.retry("a", () => Promise.resolve("recovered"));
    expect(value).toBe("recovered");
    expect(manager.get("a")?.state).toBe("ready");
  });

  it("preload never rejects at the call site even if the loader fails", async () => {
    const manager = createResourceManager<string>();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => manager.preload("a", () => Promise.reject(new Error("boom")))).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(manager.get("a")?.state).toBe("error");
    consoleError.mockRestore();
  });

  it("dispose calls the provided disposer and removes the entry", async () => {
    const manager = createResourceManager<{ id: string }>();
    await manager.load("a", () => Promise.resolve({ id: "a" }));
    const disposer = vi.fn();
    manager.dispose("a", disposer);
    expect(disposer).toHaveBeenCalledWith({ id: "a" });
    expect(manager.get("a")).toBeUndefined();
  });

  it("clear disposes every entry", async () => {
    const manager = createResourceManager<string>();
    await manager.load("a", () => Promise.resolve("a"));
    await manager.load("b", () => Promise.resolve("b"));
    const disposer = vi.fn();
    manager.clear(disposer);
    expect(disposer).toHaveBeenCalledTimes(2);
    expect(manager.get("a")).toBeUndefined();
    expect(manager.get("b")).toBeUndefined();
  });

  it("replace (hot replacement) swaps a ready value and disposes the old one", async () => {
    const onDisposed = vi.fn();
    const manager = createResourceManager<string>({ onDisposed });
    await manager.load("a", () => Promise.resolve("v1"));
    const next = await manager.replace("a", () => Promise.resolve("v2"));
    expect(next).toBe("v2");
    expect(manager.get("a")?.value).toBe("v2");
    expect(onDisposed).toHaveBeenCalledWith("a", "v1");
  });

  it("evicts the least-recently-used entry once maxEntries is exceeded", async () => {
    const onEvicted = vi.fn();
    const manager = createResourceManager<string>({ maxEntries: 2, onEvicted });
    await manager.load("a", () => Promise.resolve("a"));
    await manager.load("b", () => Promise.resolve("b"));
    await manager.load("c", () => Promise.resolve("c"));

    expect(onEvicted).toHaveBeenCalledWith("a", "a");
    expect(manager.get("a")).toBeUndefined();
    expect(manager.get("b")?.state).toBe("ready");
    expect(manager.get("c")?.state).toBe("ready");
  });

  it("accessing an entry via load() protects it from being the next eviction", async () => {
    const manager = createResourceManager<string>({ maxEntries: 2 });
    await manager.load("a", () => Promise.resolve("a"));
    await manager.load("b", () => Promise.resolve("b"));
    // Touch "a" again so "b" becomes the least-recently-used instead.
    await manager.load("a", () => Promise.resolve("a"));
    await manager.load("c", () => Promise.resolve("c"));

    expect(manager.get("a")?.state).toBe("ready");
    expect(manager.get("b")).toBeUndefined();
  });
});
