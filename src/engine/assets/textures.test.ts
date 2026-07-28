import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./manifest", () => ({
  resolveAssetUrl: (key: string) => `/textures/${key}.png?v=1`,
}));

const { loadTexture, preloadTexture, disposeTextureAsset, getTextureState, themedAssetKey } =
  await import("./textures");
const { appEvents } = await import("@/engine/events");

function fakeImage(width: number, height: number) {
  return { width, height } as unknown as HTMLImageElement;
}

describe("texture pipeline", () => {
  let loadAsyncSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    loadAsyncSpy = vi.spyOn(THREE.TextureLoader.prototype, "loadAsync");
  });

  afterEach(() => {
    loadAsyncSpy.mockRestore();
  });

  it("loadTexture resolves { status: 'loaded' }, sets sRGB color space and mipmaps by default", async () => {
    const texture = new THREE.Texture(fakeImage(64, 64));
    loadAsyncSpy.mockResolvedValue(texture);

    const result = await loadTexture("test-sleeve-a");

    expect(result).toEqual({ status: "loaded", texture });
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(texture.generateMipmaps).toBe(true);
  });

  it("a zero-dimension image fails validation and resolves to a fallback, not a thrown error", async () => {
    loadAsyncSpy.mockResolvedValue(new THREE.Texture(fakeImage(0, 0)));
    const onFailed = vi.fn();
    const unsub = appEvents.on("asset:load-failed", onFailed);

    const result = await loadTexture("test-sleeve-b");

    expect(result.status).toBe("fallback");
    expect(onFailed).toHaveBeenCalledWith(expect.objectContaining({ key: "test-sleeve-b" }));
    unsub();
  });

  it("a rejected load resolves to a fallback, never throws to the caller", async () => {
    loadAsyncSpy.mockRejectedValue(new Error("network error"));
    await expect(loadTexture("test-sleeve-c")).resolves.toEqual({
      status: "fallback",
      reason: "network error",
    });
  });

  it("respects an explicit anisotropy option instead of querying the renderer", async () => {
    const texture = new THREE.Texture(fakeImage(32, 32));
    loadAsyncSpy.mockResolvedValue(texture);

    await loadTexture("test-sleeve-d", { anisotropy: 8 });

    expect(texture.anisotropy).toBe(8);
  });

  it("a second loadTexture call for the same key is cached, not reloaded", async () => {
    loadAsyncSpy.mockResolvedValue(new THREE.Texture(fakeImage(16, 16)));
    await loadTexture("test-sleeve-e");
    await loadTexture("test-sleeve-e");
    expect(loadAsyncSpy).toHaveBeenCalledTimes(1);
  });

  it("themedAssetKey scopes a base key by theme so light/dark variants cache independently", () => {
    expect(themedAssetKey("sleeve-pattern", "light")).toBe("sleeve-pattern--light");
    expect(themedAssetKey("sleeve-pattern", "dark")).toBe("sleeve-pattern--dark");
  });

  it("disposeTextureAsset disposes the texture and removes the cache entry", async () => {
    const texture = new THREE.Texture(fakeImage(16, 16));
    const disposeSpy = vi.spyOn(texture, "dispose");
    loadAsyncSpy.mockResolvedValue(texture);
    await loadTexture("test-sleeve-f");

    disposeTextureAsset("test-sleeve-f");

    expect(disposeSpy).toHaveBeenCalled();
    expect(getTextureState("test-sleeve-f")).toBeUndefined();
  });

  it("preloadTexture is fire-and-forget", () => {
    loadAsyncSpy.mockResolvedValue(new THREE.Texture(fakeImage(16, 16)));
    expect(preloadTexture("test-sleeve-g")).toBeUndefined();
  });
});
