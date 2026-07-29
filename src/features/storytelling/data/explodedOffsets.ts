/**
 * The Crafting chapter's "cup assembles from floating pieces" moment —
 * displacement values fed into `CupAssembly`'s `partOverrides.lid`/
 * `.sleeve` (`position`/`rotation`), which are additive on top of each
 * part's own baked-in default (that default being `[0,0,0]`/identity
 * today, since no caller before this sprint ever set these — see
 * `CupAssembly.tsx`'s own Sprint 3.7 doc comment). Only lid and sleeve
 * move — the cup body stays put as the anchor, coffee/foam stay owned by
 * `useLiquidPhysics`, steam/logo/shadow don't read a moving-parts story
 * beat. A deliberate, honestly-scoped subset, not every part in
 * `CUP_PART_ORDER`.
 */
export const EXPLODED_LID_POSITION: [number, number, number] = [0.15, 0.95, 0.1];
export const EXPLODED_LID_ROTATION: [number, number, number] = [0.35, 0.9, 0.15];
export const EXPLODED_SLEEVE_POSITION: [number, number, number] = [-0.1, -0.75, -0.05];

export const ASSEMBLED_POSITION: [number, number, number] = [0, 0, 0];
export const ASSEMBLED_ROTATION: [number, number, number] = [0, 0, 0];
