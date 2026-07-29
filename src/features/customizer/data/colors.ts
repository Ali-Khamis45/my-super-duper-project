import { brandAccentColor, creamColor, espressoColor } from "@/engine/theme/ColorSchemes";

import type { CupColorId } from "@/stores/customizer-store";

export interface ColorVariant {
  id: CupColorId;
  label: string;
  /** A real hex string, derived from the same OKLCH design tokens every other themed surface in this project reads from — never an arbitrary invented hex. */
  hex: string;
}

function hex(color: ReturnType<typeof espressoColor>): string {
  return `#${color.getHexString()}`;
}

export const CUP_COLORS: readonly ColorVariant[] = [
  { id: "cream", label: "Cream", hex: hex(creamColor(50)) },
  { id: "ivory", label: "Ivory", hex: hex(creamColor(200)) },
  { id: "terracotta", label: "Terracotta", hex: hex(brandAccentColor(500)) },
  { id: "espresso", label: "Espresso", hex: hex(espressoColor(600)) },
  { id: "charcoal", label: "Charcoal", hex: hex(espressoColor(900)) },
];

export function resolveCupColor(id: CupColorId): ColorVariant {
  const variant = CUP_COLORS.find((entry) => entry.id === id);
  if (!variant) throw new Error(`Unknown cup color: "${id}"`);
  return variant;
}
