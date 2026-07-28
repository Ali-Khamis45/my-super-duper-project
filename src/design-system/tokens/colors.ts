/**
 * JS mirror of the OKLCH ramps in styles/tokens.css — needed anywhere CSS
 * custom properties aren't readable (Three.js materials, canvas). Values
 * MUST stay in sync with tokens.css; this is the only other place they may
 * be written.
 */

export type OklchColor = readonly [l: number, c: number, h: number];

export const espresso = {
  50: [0.98, 0.01, 60],
  100: [0.95, 0.015, 55],
  200: [0.88, 0.02, 50],
  300: [0.78, 0.035, 45],
  400: [0.65, 0.05, 40],
  500: [0.52, 0.06, 38],
  600: [0.42, 0.055, 35],
  700: [0.32, 0.045, 32],
  800: [0.22, 0.035, 30],
  900: [0.14, 0.025, 28],
} satisfies Record<number, OklchColor>;

export const cream = {
  50: [0.99, 0.005, 85],
  100: [0.97, 0.01, 80],
  200: [0.94, 0.015, 78],
  300: [0.9, 0.02, 75],
  400: [0.84, 0.025, 72],
  500: [0.76, 0.03, 70],
  600: [0.66, 0.03, 68],
  700: [0.55, 0.025, 65],
  800: [0.42, 0.02, 60],
  900: [0.28, 0.015, 55],
} satisfies Record<number, OklchColor>;

export const brandAccent = {
  300: [0.86, 0.09, 60],
  400: [0.78, 0.12, 58],
  500: [0.68, 0.15, 55],
  600: [0.54, 0.15, 50],
  700: [0.48, 0.13, 45],
} satisfies Record<number, OklchColor>;

/**
 * OKLCH -> linear-sRGB -> gamma-encoded sRGB (Björn Ottosson's reference
 * algorithm: https://bottosson.github.io/posts/oklab/). The one, shared
 * conversion every non-CSS OKLCH consumer builds on — `THREE.Color`
 * (engine/theme/ColorSchemes.ts) and canvas 2D `fillStyle`/`strokeStyle`
 * (engine/graphics/TextureLoader.ts) both need real RGB, and neither can
 * rely on `CSSStyleValue`/`Color.setStyle`-style OKLCH parsing (unsupported
 * by THREE.Color, inconsistent across canvas 2D implementations). Returns
 * values in [0, 1].
 */
export function oklchToSrgb([l, c, h]: OklchColor): [r: number, g: number, b: number] {
  const hueRadians = (h * Math.PI) / 180;
  const a = c * Math.cos(hueRadians);
  const b = c * Math.sin(hueRadians);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = l_ ** 3;
  const m3 = m_ ** 3;
  const s3 = s_ ** 3;

  const rLinear = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const gLinear = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bLinear = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  const gammaEncode = (value: number) => {
    const clamped = Math.min(1, Math.max(0, value));
    return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
  };

  return [gammaEncode(rLinear), gammaEncode(gLinear), gammaEncode(bLinear)];
}

/** `oklchToSrgb` formatted as a canvas/CSS-ready `rgba()` string. */
export function oklchToCssRgba(value: OklchColor, alpha = 1): string {
  const [r, g, b] = oklchToSrgb(value);
  const to255 = (channel: number) => Math.round(channel * 255);
  return `rgba(${to255(r)}, ${to255(g)}, ${to255(b)}, ${alpha})`;
}
