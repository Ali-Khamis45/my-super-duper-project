import { appEvents } from "@/engine/events";

import { track } from "./tracking";

/**
 * Analytics subscribes to the EventBus rather than features calling
 * `track()` directly — the two are never the same mechanism (see
 * docs/18_ENGINEERING_CONTRACTS.md's Review section). Imported once, for
 * its module-scope subscription side effect, by whichever feature code
 * first emits `cup:rotated` (`useCupInteractionState`).
 */
appEvents.on("cup:rotated", (event) => {
  track({ name: "hero_cup_rotated", payload: { method: event.method } });
});
