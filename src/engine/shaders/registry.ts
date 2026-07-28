import { appEvents } from "@/engine/events";

import type { ShaderDefinition } from "./types";

/**
 * Shader Registry — the same name-keyed registration pattern as
 * `createPartRegistry`/`createResourceManager`, applied to shader
 * definitions. One module-level singleton; every shader family (steam,
 * coffee, foam, glow, distortion, particles) registers itself here.
 */
export function createShaderRegistry() {
  const registry = new Map<string, ShaderDefinition>();

  return {
    register(definition: ShaderDefinition): void {
      registry.set(definition.name, definition);
    },
    resolve(name: string): ShaderDefinition {
      const definition = registry.get(name);
      if (!definition) {
        throw new Error(`Shader "${name}" is not registered.`);
      }
      return definition;
    },
    list(): string[] {
      return Array.from(registry.keys());
    },
    /**
     * Shader Versioning + the real half of "Shader Hot Reload (development)":
     * Fast Refresh already reloads the `.ts` module a shader's source lives
     * in for free (docs/adr/0008-shader-authoring-approach.md's whole
     * reason for choosing template strings over `.glsl` files) — this is
     * the one piece Fast Refresh *can't* do on its own: bumping a shader's
     * version forces any consumer keying a cache/instance on
     * `${name}@${version}` to construct a fresh instance rather than
     * reusing a stale one, and emits `shader:reloaded` for diagnostics.
     */
    bumpVersion(name: string): number {
      const definition = registry.get(name);
      if (!definition) {
        throw new Error(`Shader "${name}" is not registered.`);
      }
      definition.version += 1;
      appEvents.emit({ name: "shader:reloaded", shader: name });
      return definition.version;
    },
  };
}

export const shaderRegistry = createShaderRegistry();
