/** Common blend-mode helpers for combining two color/alpha samples inside a fragment shader (not to be confused with THREE.Blending, the GPU blend-equation setting). */
export const blendingGLSL = /* glsl */ `
float blendScreen(float base, float blend) {
  return 1.0 - (1.0 - base) * (1.0 - blend);
}
vec3 blendScreen(vec3 base, vec3 blend) {
  return 1.0 - (1.0 - base) * (1.0 - blend);
}
float blendSoftLight(float base, float blend) {
  return blend < 0.5
    ? (2.0 * base * blend + base * base * (1.0 - 2.0 * blend))
    : (sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend));
}
`;
