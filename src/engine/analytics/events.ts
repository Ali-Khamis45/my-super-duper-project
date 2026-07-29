/**
 * Real, minimal event surface — only interactions that exist this milestone.
 * Commerce/AI-barista events get added when those features exist, not
 * speculatively. See docs/01_ARCHITECTURE.md.
 */
export type AnalyticsEvent =
  | { name: "hero_cup_rotated"; payload: { method: "drag" | "touch" | "keyboard" } }
  | { name: "theme_toggled"; payload: { theme: "light" | "dark" } }
  | { name: "nav_opened"; payload: { via: "mobile-menu" } }
  | { name: "webgl_unavailable"; payload: Record<string, never> }
  | { name: "quality_tier_auto_changed"; payload: { tier: string; previous: string } }
  | { name: "performance_degraded"; payload: { fps: number } }
  | { name: "memory_pressure_detected"; payload: { reason: string } }
  | { name: "menu_searched"; payload: { query: string; resultCount: number } }
  | { name: "menu_category_filtered"; payload: { category: string } }
  | { name: "menu_drink_viewed"; payload: { drinkId: string } };
