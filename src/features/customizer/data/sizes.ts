import type { CupSizeId } from "@/stores/customizer-store";

export interface SizeVariant {
  id: CupSizeId;
  label: string;
  /** Applied to `CupAssembly`'s root group — the whole assembly scales together (handle/sleeve/lid/logo included), not just the body, so a smaller cup never looks like mismatched parts. */
  scale: number;
  volumeOz: number;
}

export const CUP_SIZES: readonly SizeVariant[] = [
  { id: "small", label: "Small", scale: 0.82, volumeOz: 8 },
  { id: "medium", label: "Medium", scale: 1, volumeOz: 12 },
  { id: "large", label: "Large", scale: 1.18, volumeOz: 16 },
];

export function resolveCupSize(id: CupSizeId): SizeVariant {
  const variant = CUP_SIZES.find((entry) => entry.id === id);
  if (!variant) throw new Error(`Unknown cup size: "${id}"`);
  return variant;
}
