import type { TasteProfile, TasteProfileQuestion } from "../types";

/**
 * The 6 string-valued input signals from the brief, as a real, typed
 * catalog — the same "curated data array" convention every other
 * `features/<name>/data/` catalog in this project follows. `sweetness`/`bitterness`
 * (1-5 numeric scales) aren't here — they're rendered by their own small,
 * dedicated control in `PreferenceQuestionnaire.tsx`, since a 1-5 scale
 * isn't the same shape as a named-option choice.
 */
export const TASTE_PROFILE_QUESTIONS: readonly TasteProfileQuestion[] = [
  {
    key: "tastePreference",
    legend: "Taste preference",
    options: [
      { value: "sweet", label: "Sweet" },
      { value: "balanced", label: "Balanced" },
      { value: "bitter", label: "Bitter" },
    ],
  },
  {
    key: "milkPreference",
    legend: "Milk preference",
    options: [
      { value: "none", label: "No milk" },
      { value: "light", label: "A little" },
      { value: "creamy", label: "Creamy" },
    ],
  },
  {
    key: "temperature",
    legend: "Temperature",
    options: [
      { value: "hot", label: "Hot" },
      { value: "iced", label: "Iced" },
      { value: "either", label: "Either" },
    ],
  },
  {
    key: "caffeineLevel",
    legend: "Caffeine level",
    options: [
      { value: "none", label: "None" },
      { value: "low", label: "Low" },
      { value: "regular", label: "Regular" },
      { value: "high", label: "High" },
    ],
  },
  {
    key: "season",
    legend: "Season",
    options: [
      { value: "spring", label: "Spring" },
      { value: "summer", label: "Summer" },
      { value: "fall", label: "Fall" },
      { value: "winter", label: "Winter" },
    ],
  },
  {
    key: "timeOfDay",
    legend: "Time of day",
    options: [
      { value: "morning", label: "Morning" },
      { value: "afternoon", label: "Afternoon" },
      { value: "evening", label: "Evening" },
    ],
  },
] as const satisfies readonly TasteProfileQuestion[];

/** Real calendar month → season, not a user-facing guess — the questionnaire pre-fills this, the user can still override it. Northern-hemisphere mapping, matching this project's existing seasonal drinks (Pumpkin Spice = fall, Peppermint = winter). */
export function resolveCurrentSeason(date: Date): TasteProfile["season"] {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "fall";
  return "winter";
}

export function resolveCurrentTimeOfDay(date: Date): TasteProfile["timeOfDay"] {
  const hour = date.getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export const DEFAULT_TASTE_PROFILE: TasteProfile = {
  tastePreference: "balanced",
  sweetness: 3,
  bitterness: 3,
  milkPreference: "light",
  temperature: "either",
  caffeineLevel: "regular",
  season: resolveCurrentSeason(new Date()),
  timeOfDay: resolveCurrentTimeOfDay(new Date()),
};

export const MIN_SCALE_VALUE = 1;
export const MAX_SCALE_VALUE = 5;
