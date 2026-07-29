import { creamColor, espressoColor } from "@/engine/theme/ColorSchemes";

import type { LidVariantId } from "@/stores/customizer-store";

export interface LidVariant {
  id: LidVariantId;
  label: string;
  /** `null` only for `"none"` — hidden entirely (a mug-style order, no lid). */
  hex: string | null;
}

function hex(color: ReturnType<typeof espressoColor>): string {
  return `#${color.getHexString()}`;
}

export const LID_VARIANTS: readonly LidVariant[] = [
  { id: "classic", label: "Classic", hex: hex(espressoColor(800)) },
  { id: "charcoal", label: "Charcoal", hex: hex(espressoColor(900)) },
  { id: "cream", label: "Cream", hex: hex(creamColor(100)) },
  { id: "none", label: "No lid", hex: null },
];

export function resolveLidVariant(id: LidVariantId): LidVariant {
  const variant = LID_VARIANTS.find((entry) => entry.id === id);
  if (!variant) throw new Error(`Unknown lid variant: "${id}"`);
  return variant;
}
