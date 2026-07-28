import { appEvents } from "@/engine/events";

import type { ShaderDiagnosticsEntry } from "./types";

/**
 * Shader Diagnostics doubles as the "Shader Cache" this sprint's brief
 * names — reframed deliberately, not by accident. A per-*instance* GPU
 * resource cache doesn't fit shader materials the way it fit Sprint 2.3's
 * PBR materials: two steam wisps need independent `uTime` phase (per-
 * instance uniforms, `common/uniforms.ts`), so caching *instances* by key
 * would be wrong. What genuinely benefits from one shared, single-owner
 * record is compile *state* per shader *definition* — which is exactly
 * what Diagnostics already needs to track for its own purpose. One
 * structure, two names in the brief, no redundant second cache built to
 * satisfy the letter of a requirement its actual mechanism doesn't fit.
 */
const diagnostics = new Map<string, ShaderDiagnosticsEntry>();

export function recordShaderPending(name: string, version: number): void {
  diagnostics.set(name, { state: "pending", version });
}

export function recordShaderCompiled(name: string, version: number, compileTimeMs: number): void {
  diagnostics.set(name, { state: "compiled", version, compileTimeMs });
  appEvents.emit({ name: "shader:compiled", shader: name });
}

export function recordShaderFailed(name: string, version: number, error: string): void {
  diagnostics.set(name, { state: "failed", version, error });
  appEvents.emit({ name: "shader:failed", shader: name, error });
}

export function getShaderDiagnostics(): ReadonlyMap<string, ShaderDiagnosticsEntry> {
  return diagnostics;
}

export function clearShaderDiagnostics(): void {
  diagnostics.clear();
}
