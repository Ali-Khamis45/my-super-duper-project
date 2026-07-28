import { describe, expect, it, vi } from "vitest";

import { appEvents } from "@/engine/events";

import { createShaderRegistry } from "./registry";
import type { ShaderDefinition } from "./types";

function fakeUnlitDefinition(name: string): ShaderDefinition {
  return {
    name,
    version: 1,
    path: "unlit",
    create: () => ({ vertexShader: "void main() {}", fragmentShader: "void main() {}", uniforms: {}, dispose: () => {} }) as never,
  };
}

describe("createShaderRegistry", () => {
  it("resolves a registered definition", () => {
    const registry = createShaderRegistry();
    const def = fakeUnlitDefinition("steam");
    registry.register(def);
    expect(registry.resolve("steam")).toBe(def);
  });

  it("throws a clear error for an unregistered shader", () => {
    const registry = createShaderRegistry();
    expect(() => registry.resolve("glow")).toThrow(/not registered/);
  });

  it("list() returns every registered name", () => {
    const registry = createShaderRegistry();
    registry.register(fakeUnlitDefinition("steam"));
    registry.register(fakeUnlitDefinition("glow"));
    expect(registry.list().sort()).toEqual(["glow", "steam"]);
  });

  it("bumpVersion increments the definition's version and emits shader:reloaded", () => {
    const registry = createShaderRegistry();
    registry.register(fakeUnlitDefinition("steam"));
    const listener = vi.fn();
    const unsub = appEvents.on("shader:reloaded", listener);

    const newVersion = registry.bumpVersion("steam");

    expect(newVersion).toBe(2);
    expect(registry.resolve("steam").version).toBe(2);
    expect(listener).toHaveBeenCalledWith({ name: "shader:reloaded", shader: "steam" });
    unsub();
  });

  it("bumpVersion throws for an unregistered shader", () => {
    const registry = createShaderRegistry();
    expect(() => registry.bumpVersion("nope")).toThrow(/not registered/);
  });

  it("two registry instances stay independent", () => {
    const registryA = createShaderRegistry();
    const registryB = createShaderRegistry();
    registryA.register(fakeUnlitDefinition("steam"));
    expect(() => registryB.resolve("steam")).toThrow();
  });
});
