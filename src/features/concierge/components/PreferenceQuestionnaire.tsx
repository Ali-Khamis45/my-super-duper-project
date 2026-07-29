"use client";

import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useConciergeStore } from "@/stores/concierge-store";

import { TASTE_PROFILE_QUESTIONS } from "../data/questions";
import { useRecommendation } from "../hooks/useRecommendation";
import type { TasteProfile } from "../types";
import { PreferenceOptionGroup } from "./PreferenceOptionGroup";
import { PreferenceScale } from "./PreferenceScale";

/**
 * "Preference Questionnaire" — a single form, not a multi-step wizard
 * (8 short questions doesn't need step-tracking state to stay usable, and
 * every answer already has a sensible default — see `data/questions.ts` —
 * so nothing here blocks submission). Every field commits immediately to
 * `concierge-store` (`taste-profile:updated` fires per field, not just on
 * submit) — "Get my recommendation" triggers generation, it doesn't
 * "save" anything that wasn't already saved.
 */
export function PreferenceQuestionnaire() {
  const tasteProfile = useConciergeStore((state) => state.tasteProfile);
  const setTasteProfileField = useConciergeStore((state) => state.setTasteProfileField);
  const { generate, isPending } = useRecommendation();
  const reducedMotion = usePrefersReducedMotion();

  function handleOptionChange<TKey extends keyof TasteProfile>(key: TKey, value: TasteProfile[TKey]) {
    setTasteProfileField(key, value);
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        generate(reducedMotion);
      }}
    >
      {TASTE_PROFILE_QUESTIONS.map((question) => (
        <PreferenceOptionGroup
          key={question.key}
          legend={question.legend}
          options={question.options}
          selected={tasteProfile[question.key] as string}
          onSelect={(value) => handleOptionChange(question.key, value as TasteProfile[typeof question.key])}
        />
      ))}

      <PreferenceScale
        legend="Sweetness"
        lowLabel="Barely"
        highLabel="Very sweet"
        value={tasteProfile.sweetness}
        onChange={(value) => handleOptionChange("sweetness", value)}
      />
      <PreferenceScale
        legend="Bitterness"
        lowLabel="Mild"
        highLabel="Bold"
        value={tasteProfile.bitterness}
        onChange={(value) => handleOptionChange("bitterness", value)}
      />

      <Button type="submit" disabled={isPending} className="mt-1 gap-2 self-start">
        <Sparkles className="size-4" aria-hidden="true" />
        {isPending ? "Thinking…" : "Get my recommendation"}
      </Button>
    </form>
  );
}
