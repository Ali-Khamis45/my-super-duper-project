import { createEventBus } from "./EventBus";
import type { AppEvent } from "./types";

/** The app-wide event bus instance — see docs/19_EVENT_CATALOG.md for the full catalog. */
export const appEvents = createEventBus<AppEvent>();

export type { AppEvent, AppEventName } from "./types";
export type { EventBus } from "./EventBus";
