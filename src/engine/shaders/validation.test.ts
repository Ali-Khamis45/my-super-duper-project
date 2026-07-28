import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { validateShaderDefinition } from "./validation";
import type { ShaderDefinition } from "./types";

function unlitDefinition(overrides: Partial<ShaderDefinition & { path: "unlit" }> = {}): ShaderDefinition {
  return {
    name: "test-shader",
    version: 1,
    path: "unlit",
    create: () =>
      new THREE.ShaderMaterial({
        vertexShader: "void main() { gl_Position = vec4(0.0); }",
        fragmentShader: "void main() { gl_FragColor = vec4(1.0); }",
        uniforms: { uTime: { value: 0 } },
      }),
    ...overrides,
  } as ShaderDefinition;
}

describe("validateShaderDefinition", () => {
  it("passes a well-formed unlit shader", () => {
    const result = validateShaderDefinition(unlitDefinition());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("fails a shader with no name", () => {
    const result = validateShaderDefinition(unlitDefinition({ name: "" }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("name"))).toBe(true);
  });

  it("fails a shader with an invalid version", () => {
    const result = validateShaderDefinition(unlitDefinition({ version: 0 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("version"))).toBe(true);
  });

  it("fails an unlit shader missing uTime", () => {
    const def = unlitDefinition({
      create: () =>
        new THREE.ShaderMaterial({
          vertexShader: "void main() {}",
          fragmentShader: "void main() {}",
          uniforms: {},
        }),
    });
    const result = validateShaderDefinition(def);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("uTime"))).toBe(true);
  });

  it("fails an unlit shader with an empty fragment shader", () => {
    const def = unlitDefinition({
      create: () =>
        new THREE.ShaderMaterial({
          vertexShader: "void main() {}",
          fragmentShader: "",
          uniforms: { uTime: { value: 0 } },
        }),
    });
    const result = validateShaderDefinition(def);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("fragment"))).toBe(true);
  });

  it("passes a physically-lit shader without requiring uTime (a different contract)", () => {
    const def: ShaderDefinition = { name: "coffee", version: 1, path: "physically-lit", apply: () => {} };
    const result = validateShaderDefinition(def);
    expect(result.valid).toBe(true);
  });
});
