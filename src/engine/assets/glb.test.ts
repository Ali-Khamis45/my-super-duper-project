import { beforeEach, describe, expect, it, vi } from "vitest";

const mockLoad = vi.fn();

vi.mock("./gltfLoader", () => ({
  getGLTFLoader: () => ({ load: mockLoad }),
}));

vi.mock("./manifest", () => ({
  resolveAssetUrl: (key: string) => `/models/${key}.glb?v=1`,
}));

// Imported after the mocks above so the module under test picks them up.
const { loadModel, preloadModel, disposeModel, getModelState } = await import("./glb");
const { appEvents } = await import("@/engine/events");

function fakeGLTF() {
  return { scene: { traverse: vi.fn() } } as unknown as import("three/examples/jsm/loaders/GLTFLoader.js").GLTF;
}

describe("GLB pipeline", () => {
  beforeEach(() => {
    mockLoad.mockReset();
  });

  it("loadModel resolves { status: 'loaded' } and emits asset:loading then asset:loaded on success", async () => {
    const gltf = fakeGLTF();
    mockLoad.mockImplementation((_url, onLoad) => onLoad(gltf));
    const events: string[] = [];
    const unsubLoading = appEvents.on("asset:loading", () => events.push("loading"));
    const unsubLoaded = appEvents.on("asset:loaded", () => events.push("loaded"));

    const result = await loadModel("test-cup-a");

    expect(result).toEqual({ status: "loaded", gltf });
    expect(events).toEqual(["loading", "loaded"]);
    unsubLoading();
    unsubLoaded();
  });

  it("loadModel never throws — a load failure resolves to { status: 'fallback' } and emits asset:load-failed", async () => {
    mockLoad.mockImplementation((_url, _onLoad, _onProgress, onError) => onError(new Error("404")));
    const onFailed = vi.fn();
    const unsub = appEvents.on("asset:load-failed", onFailed);

    const result = await loadModel("test-cup-b");

    expect(result.status).toBe("fallback");
    expect(onFailed).toHaveBeenCalledWith(expect.objectContaining({ key: "test-cup-b", reason: "404" }));
    unsub();
  });

  it("a second loadModel call for the same key returns the cached GLTF without a second load() call", async () => {
    const gltf = fakeGLTF();
    mockLoad.mockImplementation((_url, onLoad) => onLoad(gltf));

    await loadModel("test-cup-c");
    await loadModel("test-cup-c");

    expect(mockLoad).toHaveBeenCalledTimes(1);
  });

  it("preloadModel is fire-and-forget — it doesn't return a promise the caller must handle", () => {
    mockLoad.mockImplementation((_url, onLoad) => onLoad(fakeGLTF()));
    expect(preloadModel("test-cup-d")).toBeUndefined();
  });

  it("disposeModel disposes the geometry/materials and removes the cache entry", async () => {
    const traverse = vi.fn();
    mockLoad.mockImplementation((_url, onLoad) => onLoad({ scene: { traverse } }));
    await loadModel("test-cup-e");

    const onDisposed = vi.fn();
    const unsub = appEvents.on("asset:disposed", onDisposed);
    disposeModel("test-cup-e");

    expect(traverse).toHaveBeenCalled();
    expect(getModelState("test-cup-e")).toBeUndefined();
    expect(onDisposed).toHaveBeenCalledWith(expect.objectContaining({ key: "test-cup-e" }));
    unsub();
  });
});
