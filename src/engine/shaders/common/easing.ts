/** GLSL counterparts of common JS easing curves — for a shader driving its own fade/scale curve without a JS-side spring. */
export const easingGLSL = /* glsl */ `
float easeInOutQuad(float t) {
  return t < 0.5 ? 2.0 * t * t : 1.0 - pow(-2.0 * t + 2.0, 2.0) / 2.0;
}
float easeOutCubic(float t) {
  return 1.0 - pow(1.0 - t, 3.0);
}
`;
