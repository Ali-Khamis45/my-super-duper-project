import type { ForwardRefExoticComponent, RefAttributes } from "react";
import type { Group } from "three";

export type CupPartName =
  | "shadow"
  | "cup"
  | "sleeve"
  | "coffee"
  | "foam"
  | "lid"
  | "logo"
  | "steam"
  /** Sprint 3.3 — rendered zero-to-many times per frame (once per active ingredient layer), not once via `CUP_PART_ORDER` like every part above. See `CupAssembly`'s `ingredientLayers` prop. */
  | "ingredient-ring"
  | "ingredient-sprinkles";

export type PartImplementation = "procedural" | "model";

/**
 * Still unused — Sprint 3.2's Interactive Cup Designer used `materialOverrides`
 * directly instead of this coarser named-token concept (see
 * `hero-cup/README.md`'s Future Extension note, which now flags this type
 * as worth reconsidering now that a real customizer exists to test it
 * against, rather than removing it speculatively).
 */
export type CupColorway = "espresso" | "cream" | "brand-accent";

export interface CupPartProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
  visible?: boolean;
  materialOverrides?: Partial<{
    color: string;
    roughness: number;
    metalness: number;
    clearcoat: number;
  }>;
  colorway?: CupColorway;
}

/**
 * Every cup part — procedural today, GLB-backed later — implements exactly
 * this signature. `CupAssembly` depends only on this type, never a concrete
 * implementation; see docs/adr/0002-r3f-architecture.md.
 */
export type CupPartComponent = ForwardRefExoticComponent<CupPartProps & RefAttributes<Group>>;

/**
 * Sprint 3.3 — one resolved, ready-to-render ingredient layer. `CupAssembly`
 * renders one instance of `resolveCupPart(partName)` per entry in the array
 * it's given; this type carries no meaning about *which* ingredient it is
 * (no "chocolate"/"cinnamon" concept here) — `features/composer/` owns that
 * mapping entirely, this is just the same `CupPartProps` shape every other
 * part already uses, plus a stable `key` for React's list reconciliation.
 */
export interface ResolvedIngredientLayer extends CupPartProps {
  key: string;
  partName: Extract<CupPartName, "ingredient-ring" | "ingredient-sprinkles">;
}
