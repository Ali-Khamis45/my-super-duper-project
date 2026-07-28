import { describe, expect, it, vi } from "vitest";

import { createShaderMaterial, applyShader } from "./factory";
import { shaderRegistry } from "./registry";
import type { ShaderDefinition } from "./types";

// factory.ts dispatches through the module-level `shaderRegistry`
// singleton (the same one every real shader family registers against) —
// each test below registers a uniquely-named definition to avoid
// colliding with real shaders other test files may register.
describe("createShaderMaterial / applyShader dispatch", () => {
  it("createShaderMaterial resolves and calls an unlit definition's create()", () => {
    const created = { marker: "unlit-instance" };
    const create = vi.fn(() => created as never);
    const definition: ShaderDefinition = { name: "test-unlit-a", version: 1, path: "unlit", create };
    shaderRegistry.register(definition);

    const result = createShaderMaterial("test-unlit-a");

    expect(create).toHaveBeenCalledTimes(1);
    expect(result).toBe(created);
  });

  it("createShaderMaterial throws a clear error when given a physically-lit shader's name", () => {
    shaderRegistry.register({ name: "test-lit-a", version: 1, path: "physically-lit", apply: () => {} });
    expect(() => createShaderMaterial("test-lit-a")).toThrow(/physically-lit/);
  });

  it("applyShader calls a physically-lit definition's apply() with the given material", () => {
    const apply = vi.fn();
    shaderRegistry.register({ name: "test-lit-b", version: 1, path: "physically-lit", apply });
    const fakeMaterial = {} as never;

    applyShader(fakeMaterial, "test-lit-b");

    expect(apply).toHaveBeenCalledWith(fakeMaterial);
  });

  it("applyShader throws a clear error when given an unlit shader's name", () => {
    shaderRegistry.register({ name: "test-unlit-b", version: 1, path: "unlit", create: () => ({}) as never });
    expect(() => applyShader({} as never, "test-unlit-b")).toThrow(/unlit/);
  });

  it("both functions throw a clear error for a completely unregistered name", () => {
    expect(() => createShaderMaterial("does-not-exist")).toThrow(/not registered/);
    expect(() => applyShader({} as never, "does-not-exist")).toThrow(/not registered/);
  });
});
