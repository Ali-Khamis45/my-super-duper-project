import type { CameraPresetName } from "@/engine/camera/presets";
import type { EnvironmentPresetName } from "@/engine/environment/presets";
import type { LightingPresetName } from "@/engine/lighting/presets";

/** The 7 scroll chapters, exactly as named in the brief. Order here is narrative order, not just a type union — `data/chapters.ts`'s array order is the source of truth both `ChapterNav` and the scroll timeline iterate in. */
export type ChapterId = "hero" | "origins" | "crafting" | "customization" | "concierge" | "commerce" | "finale";

export interface ChapterCta {
  label: string;
  href: string;
}

/**
 * One chapter's complete narrative + scene configuration — camera/lighting/
 * environment are named presets (not raw numbers), the same registry
 * pattern every other 3D-scene-driving feature in this project already
 * uses, so a chapter's "look" is always traceable to one registered entry.
 */
export interface ChapterDefinition {
  id: ChapterId;
  /** Short chip label — `ChapterNav`'s accessible name for this chapter's dot. */
  navLabel: string;
  title: string;
  copy: string;
  cameraPreset: CameraPresetName;
  lightingPreset: LightingPresetName;
  environmentPreset: EnvironmentPresetName;
  /** Only the Finale chapter has real CTAs — every other chapter is narrative, not a conversion point. */
  ctas?: ChapterCta[];
  /** Featured ingredient ids (from `features/composer/data/ingredients.ts`) shown as a decaying-orbit reveal — only Customization uses this. */
  featuredIngredientIds?: string[];
  /** Only Crafting: drives the lid/sleeve exploded-view transform and the steam/coffee/foam shader density boost. */
  hasAssemblyMoment?: boolean;
}
