"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";

import { fadeIn, fadeUp } from "@/engine/motion/presets";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
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
  const reducedMotion = usePrefersReducedMotion();

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

          {/* Sprint 3.8 fix: the skeleton -> result swap — this panel's
              single biggest "moment," the payoff `useRecommendation`'s own
              deliberate thinking delay is building toward — had zero
              entrance motion, unlike every sibling feature's equivalent
              state swap (`CartExperience`'s empty -> items, matched here). */}
          <AnimatePresence mode="wait">
            {isPending && (
              <motion.div key="skeleton" initial={reducedMotion ? false : "hidden"} animate={reducedMotion ? undefined : "visible"} variants={fadeIn}>
                <RecommendationPanelSkeleton />
              </motion.div>
            )}
            {!isPending && lastRecommendation && (
              <motion.div
                key="result"
                ref={resultRef}
                tabIndex={-1}
                initial={reducedMotion ? false : "hidden"}
                animate={reducedMotion ? undefined : "visible"}
                variants={fadeUp}
                className="flex flex-col gap-4 outline-none"
              >
                <RecommendationPanel recommendation={lastRecommendation} />
                <DrinkComparison recommendation={lastRecommendation} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>
    </div>
  );
}
