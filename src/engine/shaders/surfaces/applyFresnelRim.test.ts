import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { applyFresnelRim } from "./applyFresnelRim";

function fakeShader() {
  return {
    uniforms: {} as Record<string, THREE.IUniform>,
    fragmentShader: "void main() {\n\t#include <opaque_fragment>\n}",
    vertexShader: "void main() {}",
  };
}

describe("applyFresnelRim", () => {
  it("sets onBeforeCompile on the material", () => {
    const material = new THREE.MeshPhysicalMaterial();
    applyFresnelRim(material);
    expect(typeof material.onBeforeCompile).toBe("function");
  });

  it("marks the material for recompilation", () => {
    // THREE's `needsUpdate` is write-only (a setter that bumps an internal
    // `version` counter, no paired getter) — the real, observable effect of
    // setting it is `version` incrementing, not reading the flag back.
    const material = new THREE.MeshPhysicalMaterial();
    const versionBefore = material.version;
    applyFresnelRim(material);
    expect(material.version).toBeGreaterThan(versionBefore);
  });

  it("injects the fresnel uniforms into the shader object onBeforeCompile receives", () => {
    const material = new THREE.MeshPhysicalMaterial();
    applyFresnelRim(material, { intensity: 0.1, power: 4 });
    const shader = fakeShader();

    material.onBeforeCompile!(shader as never, {} as never);

    expect(shader.uniforms.uFresnelIntensity?.value).toBe(0.1);
    expect(shader.uniforms.uFresnelPower?.value).toBe(4);
    expect(shader.uniforms.uFresnelColor).toBeDefined();
  });

  it("injects the rim calculation immediately before #include <opaque_fragment>, exactly once", () => {
    const material = new THREE.MeshPhysicalMaterial();
    applyFresnelRim(material);
    const shader = fakeShader();

    material.onBeforeCompile!(shader as never, {} as never);

    expect(shader.fragmentShader).toContain("rimFresnel");
    expect(shader.fragmentShader).toContain("#include <opaque_fragment>");
    // Exactly one #include <opaque_fragment> remains — the injection wraps
    // it, it doesn't duplicate or remove it.
    expect(shader.fragmentShader.match(/#include <opaque_fragment>/g)).toHaveLength(1);
  });

  it("uses default color/intensity/power when no options are given", () => {
    const material = new THREE.MeshPhysicalMaterial();
    applyFresnelRim(material);
    const shader = fakeShader();
    material.onBeforeCompile!(shader as never, {} as never);
    expect(shader.uniforms.uFresnelIntensity?.value).toBe(0.06);
    expect(shader.uniforms.uFresnelPower?.value).toBe(2.5);
  });
});
