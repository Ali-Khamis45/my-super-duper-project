"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";

import { appEvents } from "@/engine/events";
import { registerDevPanel } from "@/engine/devpanel/DevPanel";

import { getShaderDiagnostics, recordShaderCompiled, recordShaderPending } from "./diagnostics";
// Imported for their module-scope `shaderRegistry.register(...)` side
// effect — steam/coffee/foam already register via their real production
// consumers (ProceduralSteam/Coffee/Foam); glow/distortion/particles have
// no scene consumer yet, so this probe is the only thing that imports them
// at all. Without this import, `shaderRegistry.list()` simply wouldn't
// know they exist.
import "./glow/GlowMaterial";
import "./distortion/DistortionMaterial";
import "./particles/ParticleMaterial";
import { shaderRegistry } from "./registry";

/**
 * Dev-only (never mounted in production — gated at the call site, same
 * convention as `DevPanelStatsCollector`). Forces every registered *unlit*
 * shader (steam/glow/distortion/particles) to actually render at least
 * once, which is when Three.js lazily compiles a `ShaderMaterial`'s GLSL —
 * a material that's constructed but never rendered never gets a real
 * compile attempt. Physically-lit shaders (coffee/foam) already compile as
 * part of the live scene and don't need a separate probe.
 *
 * Positioned far outside the camera frustum rather than `visible={false}`
 * — an invisible object is skipped by the renderer entirely and would
 * never trigger compilation in the first place.
 *
 * "Compiled" here means "rendered without a thrown JS exception" — real
 * GLSL-level compile errors surface via Three's own `checkShaderErrors`
 * console logging (already relied on throughout this project's
 * verification methodology, e.g. the Milestone 1 CDR's precision-warning
 * disclosures), not a synchronously catchable exception. See this
 * sprint's review for how compilation was actually verified.
 */
/** Compile times over this get flagged — a real budget, not just a display number. Steam/glow/etc. are single-octave-noise fragment shaders; anything taking noticeably long signals something worth investigating, not final-tuning. */
const COMPILE_TIME_WARNING_MS = 50;

export function ShaderDiagnosticsProbe() {
  const pendingSinceRef = useRef<Map<string, number>>(new Map());

  // The registry's contents are static per module load (every shader
  // registers itself at import time, not reactively) — computing the
  // filtered name list inside the memo, rather than as an external
  // dependency, keeps this a genuine one-time construction with an
  // honest, empty dependency array. Pure construction only — recording
  // "pending" and a start timestamp are side effects, moved to the effect
  // below rather than living inside the memo itself.
  const materials = useMemo(() => {
    const unlitShaderNames = shaderRegistry.list().filter((name) => shaderRegistry.resolve(name).path === "unlit");
    return unlitShaderNames.map((name) => {
      const definition = shaderRegistry.resolve(name);
      if (definition.path !== "unlit") return null;
      try {
        return { name, material: definition.create() };
      } catch (error) {
        console.error(`[ShaderDiagnosticsProbe] "${name}" failed to construct:`, error);
        return null;
      }
    });
  }, []);

  useEffect(() => {
    for (const entry of materials) {
      if (!entry) continue;
      recordShaderPending(entry.name, shaderRegistry.resolve(entry.name).version);
      pendingSinceRef.current.set(entry.name, performance.now());
    }
  }, [materials]);

  useEffect(() => {
    registerDevPanel("shaders", () => {
      const entries = Array.from(getShaderDiagnostics().entries());
      return entries.map(([name, entry]) => `${name}: ${entry.state}`).join(" · ");
    });
  }, []);

  useFrame(() => {
    // First frame after mount is when Three.js actually compiles each
    // material below — record success (with real elapsed time, not a
    // placeholder) once we've rendered at least once.
    for (const entry of materials) {
      if (!entry) continue;
      const diagnostics = getShaderDiagnostics().get(entry.name);
      if (diagnostics?.state === "pending") {
        const startedAt = pendingSinceRef.current.get(entry.name) ?? performance.now();
        const compileTimeMs = performance.now() - startedAt;
        recordShaderCompiled(entry.name, shaderRegistry.resolve(entry.name).version, compileTimeMs);
        if (compileTimeMs > COMPILE_TIME_WARNING_MS) {
          appEvents.emit({ name: "shader:compile-time-warning", shader: entry.name, compileTimeMs });
        }
      }
    }
  });

  return (
    <group position={[0, -10_000, 0]}>
      {materials.map((entry) =>
        entry ? (
          <mesh key={entry.name} material={entry.material}>
            <planeGeometry args={[0.01, 0.01]} />
          </mesh>
        ) : null,
      )}
    </group>
  );
}
