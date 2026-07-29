"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { resolveDrink } from "@/features/menu/data/drinks";
import { useConciergeStore } from "@/stores/concierge-store";

import type { Recommendation, ScoredDrink } from "../types";

interface DrinkComparisonProps {
  recommendation: Recommendation;
}

/**
 * "Drink Comparison" + "Why alternatives were suggested" — the same
 * scoring pass's next-best picks (`recommendationEngine.ts`'s
 * `alternatives`), each with its own real reasons, not a second
 * recommendation call. An alternative can be "applied" directly too — it's
 * a real, ranked option, not just a footnote.
 */
export function DrinkComparison({ recommendation }: DrinkComparisonProps) {
  const router = useRouter();
  const applyRecommendationToCustomizer = useConciergeStore((state) => state.applyRecommendationToCustomizer);

  if (recommendation.alternatives.length === 0) return null;

  function applyAlternative(alternative: ScoredDrink) {
    applyRecommendationToCustomizer({ ...recommendation, top: alternative, suggestedCustomizations: [] });
    router.push(`/customize?drink=${alternative.drinkId}`);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-foreground text-sm font-medium">Also worth trying</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {recommendation.alternatives.map((alternative) => {
          const drink = resolveDrink(alternative.drinkId);
          if (!drink) return null;
          const topReason = alternative.reasons.find((reason) => reason.weight > 0);
          return (
            <Card key={alternative.drinkId} className="border-border border">
              <CardContent className="flex flex-col gap-2">
                <div>
                  <p className="text-foreground text-sm font-medium">{drink.name}</p>
                  <p className="text-muted-foreground text-xs">{drink.tagline}</p>
                </div>
                {topReason && <p className="text-muted-foreground text-xs">{topReason.label}</p>}
                <Button type="button" variant="outline" size="sm" onClick={() => applyAlternative(alternative)} className="self-start">
                  Apply instead
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
