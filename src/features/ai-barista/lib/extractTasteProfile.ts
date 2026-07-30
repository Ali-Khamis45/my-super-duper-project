import type { TasteProfile } from "@/features/concierge/types";

const PROFILE_BLOCK_PATTERN = /```profile\s*([\s\S]*?)```/;

const VALID_TASTE_PREFERENCE = new Set(["sweet", "bitter", "balanced"]);
const VALID_MILK_PREFERENCE = new Set(["none", "light", "creamy"]);
const VALID_TEMPERATURE = new Set(["hot", "iced", "either"]);
const VALID_CAFFEINE = new Set(["none", "low", "regular", "high"]);
const VALID_SEASON = new Set(["spring", "summer", "fall", "winter"]);
const VALID_TIME_OF_DAY = new Set(["morning", "afternoon", "evening"]);

function clampScale(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return 3;
  return Math.min(5, Math.max(1, Math.round(num)));
}

function pickEnum<T extends string>(value: unknown, valid: Set<string>, fallback: T): T {
  return valid.has(String(value)) ? (value as T) : fallback;
}

export interface ExtractedTasteProfile {
  displayContent: string;
  profile: TasteProfile | null;
}

/**
 * Sprint 3.9, Task 4 — the only place LLM output is trusted at all, and
 * even here only as far as "is this a well-formed `TasteProfile`."
 * Everything downstream (the actual drink pick) comes from
 * `generateRecommendation`, the same deterministic engine
 * `features/concierge/` already uses — never from anything the model wrote
 * directly. Malformed/missing fields fall back to a neutral default
 * (mirroring `DEFAULT_TASTE_PROFILE`), never discarded entirely: a
 * partially-useful profile still produces a real, explainable
 * recommendation rather than silently doing nothing.
 */
export function extractTasteProfile(content: string): ExtractedTasteProfile {
  const match = content.match(PROFILE_BLOCK_PATTERN);
  if (!match || match.index === undefined) return { displayContent: content, profile: null };

  const displayContent = (content.slice(0, match.index) + content.slice(match.index + match[0].length)).trim();

  try {
    const raw = JSON.parse(match[1] ?? "{}") as Record<string, unknown>;
    const profile: TasteProfile = {
      tastePreference: pickEnum(raw.tastePreference, VALID_TASTE_PREFERENCE, "balanced"),
      sweetness: clampScale(raw.sweetness),
      bitterness: clampScale(raw.bitterness),
      milkPreference: pickEnum(raw.milkPreference, VALID_MILK_PREFERENCE, "light"),
      temperature: pickEnum(raw.temperature, VALID_TEMPERATURE, "either"),
      caffeineLevel: pickEnum(raw.caffeineLevel, VALID_CAFFEINE, "regular"),
      season: pickEnum(raw.season, VALID_SEASON, "spring"),
      timeOfDay: pickEnum(raw.timeOfDay, VALID_TIME_OF_DAY, "morning"),
    };
    return { displayContent, profile };
  } catch {
    return { displayContent, profile: null };
  }
}
