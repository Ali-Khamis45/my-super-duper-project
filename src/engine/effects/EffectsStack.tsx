import { Bloom, EffectComposer } from "@react-three/postprocessing";
import type { ReactElement } from "react";

/**
 * Registered post-processing effects, as a discriminated union rather than
 * a flat `effects: EffectName[] + bloom?: BloomConfig` prop pair — adding an
 * effect is a union member + a `case`, never a new special-cased prop. Only
 * "bloom" is implemented this milestone; dof/vignette/chromaticAberration/
 * screen-space-reflections/noise are documented future entries — see
 * docs/03_3D_ENGINE.md. Scope boundary: WebGL post-processing on the 3D
 * scene only — DOM effects (e.g. checkout confetti) never enter this union.
 */
export type EffectConfig =
  | { type: "bloom"; intensity: number; threshold: number }
  | { type: "vignette"; darkness: number }
  | { type: "dof"; focusDistance: number; focalLength: number; bokehScale: number };

function renderEffect(config: EffectConfig): ReactElement | null {
  switch (config.type) {
    case "bloom":
      return (
        <Bloom
          key="bloom"
          intensity={config.intensity}
          luminanceThreshold={config.threshold}
          luminanceSmoothing={0.2}
          mipmapBlur
        />
      );
    case "vignette":
    case "dof":
      // Documented future entries — no registered implementation yet, see
      // docs/03_3D_ENGINE.md. Not reachable until a caller actually
      // constructs one of these variants, which nothing does this sprint.
      return null;
  }
}

interface EffectsStackProps {
  effects: EffectConfig[];
}

export function EffectsStack({ effects }: EffectsStackProps) {
  const children = effects.map(renderEffect).filter((el): el is ReactElement => el !== null);

  if (children.length === 0) return null;

  return <EffectComposer enableNormalPass={false}>{children}</EffectComposer>;
}
