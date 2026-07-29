import type { ChapterDefinition } from "../types";

/**
 * The 7 scroll chapters, in narrative order — the single source of truth
 * both `ChapterNav` (dot rail) and `useScrollTimeline` (GSAP orchestration)
 * iterate over, so the two can never drift out of sync with each other.
 *
 * Camera/lighting/environment choices deliberately maximize reuse of
 * already-typed-but-previously-unregistered presets over inventing new
 * ones (see `engine/camera/presets.ts`'s own doc comment) — "exploded"/
 * "product"/"checkout" were typed since Milestone 1/2 with no registered
 * config until this sprint gives each one a real, motivated first use;
 * "ai" is Sprint 3.5's own preset, reused as-is for the Concierge chapter
 * since both are "a completed recommendation, presented to you" moments.
 * Only "origins"/"finale" are genuinely new presets, because no existing
 * name fit either chapter's intent.
 */
/** Named separately (not read via `STORY_CHAPTERS[0]`) so a guaranteed-non-empty fallback never needs a non-null assertion — `tsconfig.json`'s `noUncheckedIndexedAccess` treats every array index as possibly out-of-bounds, correctly. */
export const FIRST_CHAPTER: ChapterDefinition = {
  id: "hero",
  navLabel: "Hero",
  title: "Every cup starts with a story.",
  copy: "Scroll to follow a single cup of coffee from where it begins to the moment it's yours.",
  cameraPreset: "hero",
  lightingPreset: "studio",
  environmentPreset: "studio",
};

export const STORY_CHAPTERS: readonly ChapterDefinition[] = [
  FIRST_CHAPTER,
  {
    id: "origins",
    navLabel: "Origins",
    title: "It begins far from here.",
    copy: "Real beans, real farms, real hands — sourced with care long before the first pour.",
    cameraPreset: "origins",
    lightingPreset: "golden-hour",
    environmentPreset: "golden-hour",
  },
  {
    id: "crafting",
    navLabel: "Crafting",
    title: "Every piece has a place.",
    copy: "Ceramic, sleeve, foam, steam — watch the cup come together the same way it's built for you.",
    cameraPreset: "exploded",
    lightingPreset: "cafe-ambience",
    environmentPreset: "cafe-ambience",
    hasAssemblyMoment: true,
  },
  {
    id: "customization",
    navLabel: "Customization",
    title: "Make it yours.",
    copy: "Every ingredient on this cup is a real choice — the same ones waiting for you in the customizer.",
    cameraPreset: "product",
    lightingPreset: "studio",
    environmentPreset: "studio",
    featuredIngredientIds: ["caramel", "chocolate", "sprinkles"],
  },
  {
    id: "concierge",
    navLabel: "AI Concierge",
    title: "Not sure what you're in the mood for?",
    copy: "Answer a few questions and let the AI Concierge find your match — explained, never guessed.",
    cameraPreset: "ai",
    lightingPreset: "cafe-ambience",
    environmentPreset: "cafe-ambience",
  },
  {
    id: "commerce",
    navLabel: "Commerce",
    title: "When it's ready, so is your cart.",
    copy: "Every selection you've seen carries through — same recipe, same price, no surprises at checkout.",
    cameraPreset: "checkout",
    lightingPreset: "golden-hour",
    environmentPreset: "golden-hour",
  },
  {
    id: "finale",
    navLabel: "Finale",
    title: "Your cup is waiting.",
    copy: "However you got here, there's a real cup on the other end of this scroll.",
    cameraPreset: "finale",
    lightingPreset: "night",
    environmentPreset: "night",
    ctas: [
      { label: "Browse the Menu", href: "/menu" },
      { label: "Start Customizing", href: "/customize" },
    ],
  },
] as const satisfies readonly ChapterDefinition[];

export function resolveChapter(id: string): ChapterDefinition | undefined {
  return STORY_CHAPTERS.find((chapter) => chapter.id === id);
}
