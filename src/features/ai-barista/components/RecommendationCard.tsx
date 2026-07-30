"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { appEvents } from "@/engine/events";
import type { Recommendation } from "@/features/concierge/types";
import { resolveDrink } from "@/features/menu/data/drinks";
import { useConciergeStore } from "@/stores/concierge-store";

interface RecommendationCardProps {
  recommendation: Recommendation;
}

/**
 * Sprint 3.9, Task 4 — deliberately thin: the actual "apply this
 * recommendation" logic is `concierge-store.ts`'s existing
 * `applyRecommendationToCustomizer` action, called verbatim — the exact
 * same action `RecommendationPanel`'s "Apply to Customizer" button already
 * calls. "No duplicate recipe generation. Reuse existing RecipeSnapshot
 * model. Reuse existing Customizer Store. Reuse existing Recommendation
 * Engine" per the brief, read literally rather than reimplemented.
 */
export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const router = useRouter();
  const applyRecommendationToCustomizer = useConciergeStore((state) => state.applyRecommendationToCustomizer);
  const drink = resolveDrink(recommendation.top.drinkId);
  if (!drink) return null;
  const drinkId = drink.id;

  function handleCustomize() {
    applyRecommendationToCustomizer(recommendation);
    // Same real `/customize?drink=<id>` handoff `RecommendationPanel`'s
    // "Apply to Customizer" button already uses — arriving there, not just
    // silently updating state the user has to navigate to on their own.
    appEvents.emit({ name: "ai-barista:recipe-handoff", drinkId });
    router.push(`/customize?drink=${drinkId}`);
  }

  const positiveReasons = recommendation.top.reasons.filter((reason) => reason.weight > 0).slice(0, 3);

  return (
    <div className="border-border/60 bg-background/60 mt-2 rounded-xl border p-3">
      <p className="text-foreground text-sm font-medium">{drink.name}</p>
      <p className="text-muted-foreground text-xs italic">{drink.tagline}</p>
      {positiveReasons.length > 0 && (
        <ul className="text-muted-foreground mt-1.5 space-y-0.5 text-xs">
          {positiveReasons.map((reason) => (
            <li key={reason.label}>• {reason.label}</li>
          ))}
        </ul>
      )}
      <Button type="button" size="sm" onClick={handleCustomize} className="mt-2.5 gap-1.5">
        <Sparkles className="size-3.5" aria-hidden="true" />
        Customize This Drink
      </Button>
    </div>
  );
}
