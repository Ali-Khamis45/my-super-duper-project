/**
 * Shared GLSL noise/hash utilities — vendored as template-string exports
 * per docs/adr/0008-shader-authoring-approach.md (Turbopack has no mature
 * `.glsl`-loader ecosystem; plain `.ts` string composition is the accepted
 * substitute, and gets normal Fast Refresh for free). "Random generators"
 * from this sprint's brief are folded into `hash`/`hash2` below rather than
 * a separate module — a PRNG and a noise hash are the same primitive here,
 * and a second file would just re-export the first.
 */

/** A single-float hash — the "random generator" primitive every other function in this file builds on. */
export const hashGLSL = /* glsl */ `
float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}
float hash2(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}
`;

/** Value noise (not simplex) — cheap, sufficient for a placeholder-tier effect; deliberately not domain-warped FBM. */
export const noise2DGLSL = /* glsl */ `
${hashGLSL}
float noise2D(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash2(i);
  float b = hash2(i + vec2(1.0, 0.0));
  float c = hash2(i + vec2(0.0, 1.0));
  float d = hash2(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
`;

/**
 * Fractal Brownian Motion — sums several octaves of `noise2D` at increasing
 * frequency/decreasing amplitude. Kept to a low, fixed octave count
 * (`FBM_OCTAVES`) rather than a general-purpose loop bound — this sprint's
 * placeholder shaders (docs/16_ENGINEERING_SPRINTS.md Sprint 2.4) are
 * intentionally simple, not the final domain-warped steam simulation
 * docs/13_SHADER_ARCHITECTURE.md designs for a later milestone.
 */
export const fbmGLSL = /* glsl */ `
${noise2DGLSL}
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 3; i++) {
    value += amplitude * noise2D(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}
`;
