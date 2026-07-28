import { noise2DGLSL } from "../common/noise";

/**
 * Infrastructure-ready placeholder (docs/16_ENGINEERING_SPRINTS.md Sprint
 * 2.4) — single-octave `noise2D`, deliberately not the domain-warped FBM
 * docs/13_SHADER_ARCHITECTURE.md designs for the *final* steam simulation.
 * Real visual improvement over the Milestone 1 flat radial-gradient
 * texture (organic per-pixel variation vs. a uniform blurred circle)
 * without implementing the final effect this sprint explicitly excludes.
 */
export const steamFragmentShader = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
varying vec2 vUv;

${noise2DGLSL}

void main() {
  vec2 centered = vUv - 0.5;
  float dist = length(centered);
  float radialFalloff = smoothstep(0.5, 0.0, dist);

  vec2 noiseUv = vUv * 3.0 + vec2(0.0, -uTime * 0.4);
  float n = noise2D(noiseUv) * 0.5 + 0.5;

  float alpha = radialFalloff * n * uOpacity;
  gl_FragColor = vec4(vec3(1.0), alpha);
}
`;
