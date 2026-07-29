"use client";

import { useEffect, useMemo } from "react";

import { performanceManager } from "@/engine/performance";
import { resolveQualityPolicy } from "@/engine/performance/qualityPolicy";
import { publishStorytellingProgress } from "@/engine/shaders/common/uniforms";
import { CupCanvasLoader } from "@/features/hero-cup/components/CupCanvasLoader";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useStorytellingStore } from "@/stores/storytelling-store";

import { resolveChapter } from "../data/chapters";
import { blendExplodedOffsets } from "../lib/blendExplodedOffsets";
import { resolveStoryIngredientLayers } from "../lib/resolveStoryIngredientLayers";

/**
 * The `/story` route's 3D layer — reads `stores/storytelling-store.ts`'s
 * narrative state and translates it into the exact same optional-prop
 * surface every prior feature already extended `CupCanvasLoader` with
 * (`cameraPreset` since Sprint 3.5, `partOverrides`/`ingredientLayers`
 * since Sprint 3.2/3.3, `lightingPresetOverride`/`environmentPresetOverride`
 * new this sprint) — no new rendering pipeline, the same one every route
 * shares.
 *
 * Reduced motion never forces a single static preset throughout: each
 * chapter's own camera/lighting preset still applies (a discrete choice,
 * not itself "motion") — only the continuous, scroll-scrubbed effects
 * (explode/reassemble, ingredient orbit, steam density ramp) are skipped,
 * landing directly on their end state instead of animating toward it. See
 * `README.md`'s Accessibility section.
 */
export function StoryCanvas() {
  const activeChapterId = useStorytellingStore((state) => state.activeChapterId);
  const chapterProgress = useStorytellingStore((state) => state.chapterProgress);
  const reducedMotion = usePrefersReducedMotion();
  const chapter = resolveChapter(activeChapterId);
  // "Quality tiers must automatically scale storytelling effects" — read
  // literally as *scale*, the same "never disable, only scale" policy this
  // table already applies everywhere else it isn't `bloomEnabled`.
  const tier = performanceManager.tier.useValue();
  const storytellingQuality = resolveQualityPolicy(tier).storytellingEffects;

  const isCraftingActive = chapter?.hasAssemblyMoment === true && !reducedMotion;
  // Chapter entry (progress 0) = fully exploded; chapter exit (progress 1)
  // = fully reassembled — under reduced motion, or on any other chapter,
  // this is always 0 (assembled), the exact pre-3.7 default.
  const explodeAmount = isCraftingActive ? 1 - chapterProgress : 0;
  const craftingShaderProgress = isCraftingActive ? chapterProgress * storytellingQuality.shaderBoostIntensity : 0;

  useEffect(() => {
    publishStorytellingProgress(craftingShaderProgress);
  }, [craftingShaderProgress]);

  const partOverrides = useMemo(() => {
    const { lidPosition, lidRotation, sleevePosition } = blendExplodedOffsets(explodeAmount);
    return {
      lid: {
        position: lidPosition,
        rotation: lidRotation,
        // Customization's ingredient reveal sits at foam height, directly
        // under a closed lid — visually confirmed hidden almost entirely
        // behind it (see docs/reviews/sprint-3.7-review.md). Hiding the lid
        // for this one chapter reads as "here's what's on your drink," the
        // same real reason a menu/customizer view would show a cup open.
        visible: chapter?.featuredIngredientIds ? false : undefined,
      },
      sleeve: { position: sleevePosition },
    };
  }, [explodeAmount, chapter]);

  const ingredientLayers = useMemo(() => {
    if (!chapter?.featuredIngredientIds) return undefined;
    // Reduced motion lands directly on the settled end state (progress 1)
    // rather than animating the orbit-in.
    const progress = reducedMotion ? 1 : chapterProgress;
    const ids = chapter.featuredIngredientIds.slice(0, storytellingQuality.maxFeaturedIngredients);
    return resolveStoryIngredientLayers(ids, progress);
  }, [chapter, chapterProgress, reducedMotion, storytellingQuality.maxFeaturedIngredients]);

  if (!chapter) return null;

  return (
    <CupCanvasLoader
      route="/story"
      cameraPreset={chapter.cameraPreset}
      lightingPresetOverride={chapter.lightingPreset}
      environmentPresetOverride={chapter.environmentPreset}
      partOverrides={partOverrides}
      ingredientLayers={ingredientLayers}
    />
  );
}
