import type * as THREE from "three";

/**
 * The two shader authoring paths from docs/13_SHADER_ARCHITECTURE.md,
 * unified as one discriminated registry entry: `unlit` materials are
 * constructed fresh per call (`create`) via drei's `shaderMaterial()`
 * pattern; `physically-lit` shaders mutate an existing `MeshPhysicalMaterial`
 * in place (`apply`, via `onBeforeCompile`) rather than replacing it —
 * "Shaders never own... state management," they modify an already-owned
 * material's rendering, never construct their own competing material graph
 * for a PBR surface.
 */
export type ShaderDefinition =
  | {
      name: string;
      version: number;
      path: "unlit";
      create: (uniformOverrides?: Record<string, THREE.IUniform>) => THREE.ShaderMaterial;
    }
  | {
      name: string;
      version: number;
      path: "physically-lit";
      apply: (material: THREE.Material) => void;
    };

export type ShaderCompileState = "pending" | "compiled" | "failed";

export interface ShaderDiagnosticsEntry {
  state: ShaderCompileState;
  version: number;
  compileTimeMs?: number;
  error?: string;
}
