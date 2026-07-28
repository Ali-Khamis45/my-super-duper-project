/**
 * Linear <-> sRGB conversion — the GLSL-side counterpart to
 * `design-system/tokens/colors.ts`'s `oklchToSrgb` JS conversion. Three.js's
 * shader pipeline operates in linear space internally (see
 * docs/18_ENGINEERING_CONTRACTS.md's Shader Contracts "Color spaces" rule)
 * — any shader that samples a texture authored in display-encoded sRGB (a
 * canvas texture, a PNG) and wants to do further linear-space math on it
 * needs this, rather than assuming Three's automatic output conversion
 * covers every intermediate step.
 */
// Gamma-2.2 approximation, not the exact piecewise sRGB transfer function
// (which has a linear segment near black) — the standard, imperceptible
// simplification for real-time shader work. The JS-side `oklchToSrgb`
// (design-system/tokens/colors.ts) uses the exact reference formula; this
// is intentionally the cheaper GPU-side approximation, not a duplicate of
// it — never compare the two bit-for-bit.
export const colorSpaceGLSL = /* glsl */ `
vec3 srgbToLinear(vec3 srgb) {
  return pow(srgb, vec3(2.2));
}
vec3 linearToSrgb(vec3 linear) {
  return pow(linear, vec3(1.0 / 2.2));
}
`;
