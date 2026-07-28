import * as THREE from "three";

/**
 * The physically-lit path (docs/13_SHADER_ARCHITECTURE.md) — extends an
 * existing `MeshPhysicalMaterial` via `onBeforeCompile` rather than hand-
 * rolling PBR lighting in a custom shader. Shared by coffee and foam
 * (docs/13_SHADER_ARCHITECTURE.md already names foam's fresnel rim and
 * coffee sharing "one shared onBeforeCompile convention, not two different
 * techniques for two similar surfaces" — this is that shared convention,
 * built for real).
 *
 * Injection point verified against this project's exact installed Three.js
 * version (`node_modules/three/src/renderers/shaders/ShaderLib/meshphysical.glsl.js`),
 * not assumed from memory — `#include <opaque_fragment>` is where
 * `outgoingLight` is finalized into `gl_FragColor`, immediately before tone
 * mapping runs. Modifying `outgoingLight` here (not `gl_FragColor` after
 * `#include <opaque_fragment>`) keeps the rim brightening physically
 * coherent under ACES tone mapping rather than fighting it.
 *
 * Real, accepted maintenance risk (docs/24_RISK_REGISTER.md R-13): this
 * string-patches Three's internal shader chunk structure, which isn't a
 * fully stable public API across major versions. A future Three.js bump
 * could silently break this without a compile error — the mitigation is
 * visual regression coverage (docs/21_TEST_STRATEGY.md), not a guarantee
 * this can't happen.
 */
export interface FresnelRimOptions {
  color?: THREE.Color;
  intensity?: number;
  power?: number;
}

export function applyFresnelRim(material: THREE.MeshPhysicalMaterial, options: FresnelRimOptions = {}): void {
  const { color = new THREE.Color(1, 1, 1), intensity = 0.06, power = 2.5 } = options;

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFresnelColor = { value: color };
    shader.uniforms.uFresnelIntensity = { value: intensity };
    shader.uniforms.uFresnelPower = { value: power };

    shader.fragmentShader = `
uniform vec3 uFresnelColor;
uniform float uFresnelIntensity;
uniform float uFresnelPower;
${shader.fragmentShader}
`.replace(
      "#include <opaque_fragment>",
      `
float rimFresnel = pow(1.0 - clamp(dot(geometryViewDir, geometryNormal), 0.0, 1.0), uFresnelPower);
outgoingLight += uFresnelColor * rimFresnel * uFresnelIntensity;
#include <opaque_fragment>
`,
    );
  };
  material.needsUpdate = true;
}
