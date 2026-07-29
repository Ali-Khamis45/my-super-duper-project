import { creamColor, espressoColor } from "@/engine/theme/ColorSchemes";

import type { SleeveVariantId } from "@/stores/customizer-store";

export interface SleeveVariant {
  id: SleeveVariantId;
  label: string;
  /** `null` only for `"none"` — the sleeve part is hidden (`visible: false`) entirely, so no color ever applies. */
  hex: string | null;
}

function hex(color: ReturnType<typeof espressoColor>): string {
  return `#${color.getHexString()}`;
}

export const SLEEVE_VARIANTS: readonly SleeveVariant[] = [
  { id: "kraft", label: "Kraft", hex: hex(espressoColor(400)) },
  { id: "charcoal", label: "Charcoal", hex: hex(espressoColor(900)) },
  { id: "cream", label: "Cream", hex: hex(creamColor(100)) },
  { id: "none", label: "No sleeve", hex: null },
];

export function resolveSleeveVariant(id: SleeveVariantId): SleeveVariant {
  const variant = SLEEVE_VARIANTS.find((entry) => entry.id === id);
  if (!variant) throw new Error(`Unknown sleeve variant: "${id}"`);
  return variant;
}
