import type { ForwardRefExoticComponent, RefAttributes } from "react";
import type { Group } from "three";

export type CupPartName = "shadow" | "cup" | "sleeve" | "coffee" | "foam" | "lid" | "logo" | "steam";

export type PartImplementation = "procedural" | "model";

/**
 * Reserved for Milestone 4's live customizer — a named token, not an
 * arbitrary hex, so a future customizer swaps between a small curated set
 * rather than free-form color picking. Unused this milestone; no default
 * part sets it.
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
