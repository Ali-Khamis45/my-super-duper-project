import * as THREE from "three";

import { brandAccent, cream, espresso, oklchToSrgb } from "@/design-system/tokens/colors";

function toThreeColor(value: readonly [number, number, number]): THREE.Color {
  const [r, g, b] = oklchToSrgb(value);
  return new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
}

export function espressoColor(step: keyof typeof espresso): THREE.Color {
  return toThreeColor(espresso[step]);
}

export function creamColor(step: keyof typeof cream): THREE.Color {
  return toThreeColor(cream[step]);
}

export function brandAccentColor(step: keyof typeof brandAccent): THREE.Color {
  return toThreeColor(brandAccent[step]);
}
