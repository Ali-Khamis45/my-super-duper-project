"use client";

import { useEffect, useRef } from "react";

import { useConciergeStore } from "@/stores/concierge-store";

import { useRecommendation } from "../hooks/useRecommendation";
import { ConciergeCanvas } from "./ConciergeCanvas";
import { DrinkComparison } from "./DrinkComparison";
import { PreferenceQuestionnaire } from "./PreferenceQuestionnaire";
import { RecommendationAnnouncer } from "./RecommendationAnnouncer";
import { RecommendationPanel, RecommendationPanelSkeleton } from "./RecommendationPanel";

/**
 * Same stacked-on-mobile/side-by-side-from-lg layout `features/customizer/`'s
 * `CustomizerExperience` established. "Focus management" (the brief's own
 * accessibility requirement): once a recommendation lands, focus moves to
 * its heading — the same "meaningful DOM update gets a focus move" pattern
 * a dialog opening already gets for free from `base-ui`'s `Dialog`, applied
 * here by hand since this is a route update, not a dialog.
 */
export function ConciergeExperience() {
  const lastRecommendation = useConciergeStore((state) => state.lastRecommendation);
  const { isPending } = useRecommendation();
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lastRecommendation) resultRef.current?.focus();
  }, [lastRecommendation]);

  return (
    <div id="main-content" className="flex min-h-screen flex-col pt-20 lg:flex-row lg:pt-24">
      <RecommendationAnnouncer />
      <div className="relative h-[45vh] w-full lg:h-auto lg:flex-1">
        <ConciergeCanvas />
      </div>
      <aside className="border-border w-full border-t lg:h-auto lg:w-[26rem] lg:border-t-0 lg:border-l">
        <div className="flex h-full flex-col gap-6 overflow-y-auto p-4">
          <div>
            <h1 className="font-display text-lg">AI Coffee Concierge</h1>
            <p className="text-muted-foreground text-sm">
              Answer a few questions and get a real, explained recommendation from the menu — not a generic guess.
            </p>
          </div>

          <PreferenceQuestionnaire />

          {isPending && <RecommendationPanelSkeleton />}

          {!isPending && lastRecommendation && (
            <div ref={resultRef} tabIndex={-1} className="flex flex-col gap-4 outline-none">
              <RecommendationPanel recommendation={lastRecommendation} />
              <DrinkComparison recommendation={lastRecommendation} />
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
