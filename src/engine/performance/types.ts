/**
 * Extended from `"high" | "medium" | "low"` (Sprint 2.1) to 5 tiers in
 * Sprint 2.5 — a real, additive extension per docs/17_ZERO_REWRITE_POLICY.md:
 * every existing value is preserved unchanged, so any consumer that only
 * ever handled a subset (nothing did exhaustive matching without the
 * `Record<QualityTier, X>` shape, which the type system already forces to
 * be updated everywhere) keeps compiling and behaving identically. The two
 * new values (`ultra`, `minimal`) are additions, not renames.
 */
export type QualityTier = "ultra" | "high" | "medium" | "low" | "minimal";

export const QUALITY_TIER_ORDER: readonly QualityTier[] = ["ultra", "high", "medium", "low", "minimal"];

/**
 * Automatic: the Adaptive Quality Manager continuously selects a tier from
 * measured performance. Manual: a pinned tier stays fixed regardless of
 * measurements (dev testing, a future user-facing "performance mode"
 * toggle). "Automatic" was never a sensible *tier* value itself — you
 * can't render at "automatic" quality, only at a concrete tier chosen
 * automatically — so it's a separate, orthogonal `QualityMode`, not a 6th
 * `QualityTier` member.
 */
export type QualityMode = "automatic" | "manual";
