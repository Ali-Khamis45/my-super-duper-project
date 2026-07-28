/** 2D rotation, used by any shader that needs to spin a UV/noise sample (e.g. a future distortion swirl). */
export const rotate2DGLSL = /* glsl */ `
mat2 rotate2D(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}
`;
