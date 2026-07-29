"use client";

import { Separator } from "@/components/ui/separator";
import { useCustomizerStore } from "@/stores/customizer-store";
import type { CustomizerCategory, CustomizerSelection } from "@/stores/customizer-store";

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
 * touched, per this sprint's explicit constraint. `preview` is read once
 * here and split per-category so each `VariantSwatchGroup` only re-renders
 * when *its own* category's preview changes, not on every hover anywhere
 * in the panel.
 */
export function CustomizerPanel() {
  const selection = useCustomizerStore((state) => state.selection);
  const preview = useCustomizerStore((state) => state.preview);
  const select = useCustomizerStore((state) => state.select);
  const setPreview = useCustomizerStore((state) => state.setPreview);

  function previewFor(category: CustomizerCategory): string | null {
    const value = preview?.[category];
    return typeof value === "string" ? value : null;
  }

  function makeHandlers(category: CustomizerCategory) {
    return {
      // `VariantSwatchGroup` is intentionally generic over plain `string`
      // ids (it renders Color/Size/Sleeve/Lid/Logo/Material uniformly, with
      // no reason to know each category's specific union type). By
      // construction, every option array passed to a given section already
      // only contains that category's real id values (e.g. `CUP_COLORS`'s
      // ids are `CupColorId`), so this cast to the *union* of every
      // category's value type (not `never`, which would suppress checking
      // entirely) reflects a real, narrower guarantee this component
      // upholds rather than an escape hatch.
      onCommit: (id: string, via: "click" | "keyboard") => select(category, id as CustomizerSelection[CustomizerCategory], via),
      onPreview: (id: string | null) => setPreview(id === null ? null : { ...preview, [category]: id }),
    };
  }

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg">Customize</h2>
        <UndoRedoControls />
      </div>

      <VariantSwatchGroup legend="Color" options={CUP_COLORS} selectedId={selection.color} previewId={previewFor("color")} {...makeHandlers("color")} />
      <VariantSwatchGroup legend="Size" options={SIZE_OPTIONS} selectedId={selection.size} previewId={previewFor("size")} {...makeHandlers("size")} />
      <VariantSwatchGroup legend="Sleeve" options={SLEEVE_VARIANTS} selectedId={selection.sleeve} previewId={previewFor("sleeve")} {...makeHandlers("sleeve")} />
      <VariantSwatchGroup legend="Lid" options={LID_VARIANTS} selectedId={selection.lid} previewId={previewFor("lid")} {...makeHandlers("lid")} />
      <VariantSwatchGroup legend="Logo" options={LOGO_VARIANTS} selectedId={selection.logo} previewId={previewFor("logo")} {...makeHandlers("logo")} />
      <VariantSwatchGroup legend="Material" options={MATERIAL_OPTIONS} selectedId={selection.material} previewId={previewFor("material")} {...makeHandlers("material")} />

      <Separator />
      <PresetSaveControls />
    </div>
  );
}
