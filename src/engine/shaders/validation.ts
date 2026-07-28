import type { ShaderDefinition } from "./types";

export interface ShaderValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Static, structural validation — everything checkable without a real
 * WebGL context (jsdom has none). Real GLSL *compilation* is a separate,
 * necessarily browser-verified concern — see `DevDiagnosticsProbe.tsx` and
 * this sprint's review for how that half is actually covered.
 */
export function validateShaderDefinition(definition: ShaderDefinition): ShaderValidationResult {
  const errors: string[] = [];

  if (!definition.name.trim()) {
    errors.push("Shader definition is missing a name.");
  }
  if (!Number.isInteger(definition.version) || definition.version < 1) {
    errors.push(`Shader "${definition.name}" has an invalid version (${definition.version}); versions start at 1.`);
  }

  if (definition.path === "unlit") {
    const material = definition.create();
    if (!material.vertexShader.trim()) {
      errors.push(`Shader "${definition.name}" has an empty vertex shader.`);
    }
    if (!material.fragmentShader.trim()) {
      errors.push(`Shader "${definition.name}" has an empty fragment shader.`);
    }
    // Every unlit effect shader in this sprint's common-uniform contract is
    // expected to animate over time — a shader claiming the "unlit" path
    // without `uTime` is very likely missing real per-instance wiring.
    if (!("uTime" in material.uniforms)) {
      errors.push(`Shader "${definition.name}" (unlit) has no "uTime" uniform — see common/uniforms.ts's createPerInstanceUniforms.`);
    }
    material.dispose();
  }

  return { valid: errors.length === 0, errors };
}
