"use client";

import { Separator } from "@/components/ui/separator";
import { AddToCartButton } from "@/features/cart/components/AddToCartButton";
import { ComposerSection } from "@/features/composer/components/ComposerSection";

import { CUP_COLORS } from "../data/colors";
import { LID_VARIANTS } from "../data/lids";
import { LOGO_VARIANTS } from "../data/logos";
import { MATERIAL_PRESETS } from "../data/materials";
import { SLEEVE_VARIANTS } from "../data/sleeves";
import { CUP_SIZES } from "../data/sizes";
import { PresetSaveControls } from "./PresetSaveControls";
import { UndoRedoControls } from "./UndoRedoControls";
import { VariantSwatchGroup } from "./VariantSwatchGroup";

const SIZE_OPTIONS = CUP_SIZES.map((size) => ({ id: size.id, label: `${size.label} (${size.volumeOz}oz)` }));
const MATERIAL_OPTIONS = MATERIAL_PRESETS.map((preset) => ({ id: preset.id, label: preset.label }));

/**
 * The customizer's control surface. Every section is a `VariantSwatchGroup`
 * reading/writing the same dedicated `customizer-store` — no engine store
 * touched, per this sprint's explicit constraint. This component itself
 * reads no `customizer-store` state at all (Sprint 3.8 perf fix — see
 * `VariantSwatchGroup`'s own doc comment): each group subscribes to its
 * own category's `selection`/`preview` slice directly, so hovering one
 * swatch never re-renders this panel or the other five groups.
 */
export function CustomizerPanel() {
  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg">Customize</h2>
        <UndoRedoControls />
      </div>

      <VariantSwatchGroup legend="Color" options={CUP_COLORS} category="color" />
      <VariantSwatchGroup legend="Size" options={SIZE_OPTIONS} category="size" />
      <VariantSwatchGroup legend="Sleeve" options={SLEEVE_VARIANTS} category="sleeve" />
      <VariantSwatchGroup legend="Lid" options={LID_VARIANTS} category="lid" />
      <VariantSwatchGroup legend="Logo" options={LOGO_VARIANTS} category="logo" />
      <VariantSwatchGroup legend="Material" options={MATERIAL_OPTIONS} category="material" />

      <ComposerSection />

      <Separator />
      <PresetSaveControls />

      <Separator />
      <AddToCartButton />
    </div>
  );
}
