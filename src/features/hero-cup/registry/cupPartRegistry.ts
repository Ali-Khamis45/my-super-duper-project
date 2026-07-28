import { createPartRegistry } from "@/engine/registry/createPartRegistry";

import { ProceduralContactShadow } from "../parts/ProceduralContactShadow";
import { ProceduralCoffee } from "../parts/ProceduralCoffee";
import { ProceduralCup } from "../parts/ProceduralCup";
import { ProceduralFoam } from "../parts/ProceduralFoam";
import { ProceduralLid } from "../parts/ProceduralLid";
import { ProceduralLogo } from "../parts/ProceduralLogo";
import { ProceduralSleeve } from "../parts/ProceduralSleeve";
import { ProceduralSteam } from "../parts/ProceduralSteam";
import type { CupPartName, CupPartProps } from "./types";

/**
 * The cup's instance of the generalized registry (docs/03_3D_ENGINE.md).
 * Adding a future GLB submesh is one `.register(name, "model", Component)`
 * call — zero changes to CupAssembly or anything else that renders parts.
 * See docs/adr/0002-r3f-architecture.md.
 */
const cupPartRegistry = createPartRegistry<CupPartName, CupPartProps>();

cupPartRegistry.register("shadow", "procedural", ProceduralContactShadow);
cupPartRegistry.register("cup", "procedural", ProceduralCup);
cupPartRegistry.register("sleeve", "procedural", ProceduralSleeve);
cupPartRegistry.register("coffee", "procedural", ProceduralCoffee);
cupPartRegistry.register("foam", "procedural", ProceduralFoam);
cupPartRegistry.register("lid", "procedural", ProceduralLid);
cupPartRegistry.register("logo", "procedural", ProceduralLogo);
cupPartRegistry.register("steam", "procedural", ProceduralSteam);

export const resolveCupPart = cupPartRegistry.resolve;

/** Render order matters for transparency/overlap (steam last, shadow first). */
export const CUP_PART_ORDER: CupPartName[] = [
  "shadow",
  "cup",
  "sleeve",
  "coffee",
  "foam",
  "lid",
  "logo",
  "steam",
];
