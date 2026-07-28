import type * as THREE from "three";

import { shaderRegistry } from "./registry";

/**
 * Shader Factory — the only place a consumer touches a registered shader
 * definition's construction mechanism directly. Deliberately two entry
 * points, not one, matching `ShaderDefinition`'s two paths: forcing them
 * through a single polymorphic function would hide which mechanism a
 * caller is actually invoking, exactly the kind of false unification
 * Sprint 2.1's `useGestureRecognizer`/`useCupInteractionState` finding
 * warned against repeating.
 */
export function createShaderMaterial(
  name: string,
  uniformOverrides?: Record<string, THREE.IUniform>,
): THREE.ShaderMaterial {
  const definition = shaderRegistry.resolve(name);
  if (definition.path !== "unlit") {
    throw new Error(`"${name}" is a physically-lit shader — use applyShader(material, "${name}") instead.`);
  }
  return definition.create(uniformOverrides);
}

export function applyShader(material: THREE.Material, name: string): void {
  const definition = shaderRegistry.resolve(name);
  if (definition.path !== "physically-lit") {
    throw new Error(`"${name}" is an unlit shader — use createShaderMaterial("${name}") instead.`);
  }
  definition.apply(material);
}
