import type { AnalyticsEvent } from "./events";

/**
 * The sink is intentionally a stub — console output in development, a no-op
 * in production. Swap the production branch for a real provider (PostHog,
 * GA, etc.) when one is chosen; every call site stays the same.
 */
export function track(event: AnalyticsEvent) {
  if (process.env.NODE_ENV !== "production") {
    console.debug("[analytics]", event.name, event.payload);
  }
}
