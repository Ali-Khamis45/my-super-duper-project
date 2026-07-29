import { FOAM_HEIGHT } from "@/features/hero-cup/parts/ProceduralFoam";
import type { ResolvedIngredientLayer } from "@/features/hero-cup/registry/types";

import { resolveIngredient } from "../../composer/data/ingredients";

const LAYER_BASE_HEIGHT = FOAM_HEIGHT + 0.03;
// Kept inside the Customization chapter's "product" camera frustum at its
// framing distance (verified visually — see docs/reviews/sprint-3.7-review.md's
// Creative Director Review) rather than picked arbitrarily; a larger
// radius orbited outside the visible frame at low chapter progress.
const ORBIT_RADIUS = 0.55;
// The settled (progress=1) radius never fully collapses to the cup's own
// center — a real, visible "arranged around the cup" resting position, not
// a shrink-to-invisible one (also verified visually).
const MIN_SETTLE_FACTOR = 0.4;
const TAU = Math.PI * 2;

/**
 * The Customization chapter's "ingredients orbit before settling" moment —
 * a real, computed decaying-radius orbit (not true per-ingredient
 * physics), driven by this one chapter's own local 0-1 progress. Each
 * ingredient's phase is derived from its index so a fixed set of featured
 * ingredients spreads evenly around the cup rather than overlapping.
 * Reuses `features/composer/data/ingredients.ts`'s real catalog via
 * `resolveIngredient` — never a second, storytelling-only ingredient list.
 *
 * Pure and deterministic for a fixed `(featuredIngredientIds, progress)`
 * pair — same reasoning as `features/composer/lib/resolveIngredientLayers.ts`,
 * easy to unit test, safe to call every render.
 */
export function resolveStoryIngredientLayers(featuredIngredientIds: string[], progress: number): ResolvedIngredientLayer[] {
  const clampedProgress = Math.min(1, Math.max(0, progress));
  // Decays from 1 (fully orbiting, far from center) to `MIN_SETTLE_FACTOR`
  // (settled, still visibly offset) — eased rather than linear so the
  // settle reads as a deceleration, not a snap.
  const settleFactor = MIN_SETTLE_FACTOR + (1 - MIN_SETTLE_FACTOR) * (1 - clampedProgress * clampedProgress);
  const layers: ResolvedIngredientLayer[] = [];

  featuredIngredientIds.forEach((ingredientId, index) => {
    const ingredient = resolveIngredient(ingredientId);
    if (!ingredient) return;

    const phase = (index / featuredIngredientIds.length) * TAU;
    const radius = ORBIT_RADIUS * settleFactor;
    const height = LAYER_BASE_HEIGHT + index * 0.045;
    const scale = 0.6 + clampedProgress * 0.4;

    const partName = ingredient.shape === "sprinkles" ? "ingredient-sprinkles" : ingredient.shape === "ice" ? "ingredient-ice" : "ingredient-ring";

    layers.push({
      key: `story-${ingredientId}`,
      partName,
      position: [Math.cos(phase) * radius, height, Math.sin(phase) * radius],
      scale,
      materialOverrides: partName === "ingredient-ice" ? undefined : { color: ingredient.color },
      visible: clampedProgress > 0.02,
    });
  });

  return layers;
}
