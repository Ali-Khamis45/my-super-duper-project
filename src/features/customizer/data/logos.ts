import type { LogoVariantId } from "@/stores/customizer-store";

export interface LogoVariant {
  id: LogoVariantId;
  label: string;
  visible: boolean;
}

/**
 * Two real options, not a placeholder single-choice list: only one badge
 * design exists today (`ProceduralLogo.tsx`'s generated texture), so
 * "which logo" collapses to "show it or don't" — a genuine, complete
 * variant set for what actually exists, not artificially padded. A second
 * badge design (color/shape) is a real future extension, not built ahead
 * of a second asset existing — see this feature's README.
 */
export const LOGO_VARIANTS: readonly LogoVariant[] = [
  { id: "classic", label: "Classic badge", visible: true },
  { id: "none", label: "No logo", visible: false },
];

export function resolveLogoVariant(id: LogoVariantId): LogoVariant {
  const variant = LOGO_VARIANTS.find((entry) => entry.id === id);
  if (!variant) throw new Error(`Unknown logo variant: "${id}"`);
  return variant;
}
