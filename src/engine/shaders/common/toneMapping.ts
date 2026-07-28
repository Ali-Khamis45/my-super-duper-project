/**
 * A cheap Reinhard tonemap for shaders that self-tonemap before additive
 * blending (e.g. a future glow effect that would otherwise blow out past
 * 1.0 when stacked with Bloom) — not a replacement for the renderer's own
 * ACES tone mapping (docs/03_3D_ENGINE.md's tone-mapping gotcha), a
 * per-shader pre-pass some unlit/additive effects need in addition to it.
 */
export const toneMappingGLSL = /* glsl */ `
vec3 reinhardToneMap(vec3 color) {
  return color / (color + vec3(1.0));
}
`;
