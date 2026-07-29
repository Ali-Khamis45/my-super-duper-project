import type { CupPartName, CupPartProps } from "@/features/hero-cup/registry/types";
import type { CustomizerSelection } from "@/stores/customizer-store";

import { resolveCupColor } from "../data/colors";
import { resolveLidVariant } from "../data/lids";
import { resolveLogoVariant } from "../data/logos";
import { resolveMaterialPreset } from "../data/materials";
import { resolveSleeveVariant } from "../data/sleeves";
import { resolveCupSize } from "../data/sizes";

export interface ResolvedCustomization {
  cupScale: number;
  partOverrides: Partial<Record<CupPartName, CupPartProps>>;
}

/**
 * The one place a `CustomizerSelection` becomes real `CupPartProps` —
 * everything downstream (`CupAssembly`/`CupScene`/`CupCanvas`) just applies
 * whatever it's given, with zero knowledge of "customizer" concepts. Pure
 * and synchronous: no state, no side effects, easy to unit test and easy
 * to call once per render without memoizing prematurely.
 */
export function resolvePartOverrides(selection: CustomizerSelection): ResolvedCustomization {
  const color = resolveCupColor(selection.color);
  const size = resolveCupSize(selection.size);
  const sleeve = resolveSleeveVariant(selection.sleeve);
  const lid = resolveLidVariant(selection.lid);
  const logo = resolveLogoVariant(selection.logo);
  const finish = resolveMaterialPreset(selection.material);

  const finishOverrides = { roughness: finish.roughness, metalness: finish.metalness, clearcoat: finish.clearcoat };

  const partOverrides: Partial<Record<CupPartName, CupPartProps>> = {
    cup: {
      materialOverrides: { color: color.hex, ...finishOverrides },
    },
    sleeve:
      sleeve.hex === null
        ? { visible: false }
        : { visible: true, materialOverrides: { color: sleeve.hex, ...finishOverrides } },
    lid:
      lid.hex === null
        ? { visible: false }
        : { visible: true, materialOverrides: { color: lid.hex, ...finishOverrides } },
    logo: { visible: logo.visible },
  };

  return { cupScale: size.scale, partOverrides };
}
