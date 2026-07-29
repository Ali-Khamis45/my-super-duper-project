"use client";

import { Heart, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveIngredient } from "@/features/composer/data/ingredients";
import { resolveCategory } from "@/features/menu/data/categories";
import { resolveDrink } from "@/features/menu/data/drinks";
import { cn } from "@/lib/utils";
import { useConciergeStore } from "@/stores/concierge-store";

import type { Recommendation } from "../types";

/** >=70% "a great match," 40-70% "a good match," below that "worth trying" — a real, distinct confidence indicator, not a decorative percentage. */
function describeConfidence(confidence: number): string {
  if (confidence >= 0.7) return "Great match";
  if (confidence >= 0.4) return "Good match";
  return "Worth trying";
}

interface RecommendationPanelProps {
  recommendation: Recommendation;
}

/**
 * "Explain Recommendation," "One-click Apply to Customizer," "Favorite
 * Recommendations" — all in one place, since they're all about the same
 * single top pick. "Never present an unexplained recommendation" (the
 * brief's own closing words): `recommendation.top.reasons` is rendered in
 * full, every time, not collapsed behind a "why?" affordance a user might
 * never open.
 */
export function RecommendationPanel({ recommendation }: RecommendationPanelProps) {
  const router = useRouter();
  const drink = resolveDrink(recommendation.top.drinkId);
  const applyRecommendationToCustomizer = useConciergeStore((state) => state.applyRecommendationToCustomizer);
  const favorites = useConciergeStore((state) => state.favorites);
  const toggleFavorite = useConciergeStore((state) => state.toggleFavorite);
  const isFavorited = favorites.some((entry) => entry.id === recommendation.id);

  if (!drink) return null;

  function handleApply() {
    applyRecommendationToCustomizer(recommendation);
    // "One-click Apply to Customizer" means arriving there, not just
    // silently updating state the user has to navigate to on their own —
    // the same real `/customize?drink=<id>` routing Sprint 3.3 built for
    // the menu's own "Customize this drink" CTA.
    router.push(`/customize?drink=${drink!.id}`);
  }

  const category = resolveCategory(drink.category);
  const positiveReasons = recommendation.top.reasons.filter((reason) => reason.weight > 0);
  const negativeReasons = recommendation.top.reasons.filter((reason) => reason.weight < 0);

  return (
    <Card className="border-brand-accent-500/30 border">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-muted-foreground text-xs tracking-wide uppercase">{category.label}</p>
            <h2 className="font-display text-xl">{drink.name}</h2>
            <p className="text-muted-foreground text-sm italic">{drink.tagline}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={isFavorited ? `Remove ${drink.name} from favorites` : `Save ${drink.name} to favorites`}
            aria-pressed={isFavorited}
            onClick={() => toggleFavorite(recommendation)}
          >
            <Heart className={cn("size-4", isFavorited && "fill-brand-accent-500 text-brand-accent-500")} aria-hidden="true" />
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="text-brand-accent-500 size-4" aria-hidden="true" />
          <span className="font-medium">{describeConfidence(recommendation.top.confidence)}</span>
          <span className="text-muted-foreground">({Math.round(recommendation.top.confidence * 100)}% confidence)</span>
        </div>

        {positiveReasons.length > 0 && (
          <div>
            <p className="text-foreground text-sm font-medium">Why this one</p>
            <ul className="text-muted-foreground mt-1 flex flex-col gap-1 text-sm">
              {positiveReasons.map((reason) => (
                <li key={reason.label}>• {reason.label}</li>
              ))}
            </ul>
          </div>
        )}

        {negativeReasons.length > 0 && (
          <div>
            <p className="text-foreground text-sm font-medium">Worth knowing</p>
            <ul className="text-muted-foreground mt-1 flex flex-col gap-1 text-sm">
              {negativeReasons.map((reason) => (
                <li key={reason.label}>• {reason.label}</li>
              ))}
            </ul>
          </div>
        )}

        {recommendation.suggestedCustomizations.length > 0 && (
          <div>
            <p className="text-foreground text-sm font-medium">Suggested customizations</p>
            <ul className="text-muted-foreground mt-1 flex flex-col gap-1 text-sm">
              {recommendation.suggestedCustomizations.map((customization) => {
                const ingredient = resolveIngredient(customization.ingredientId);
                if (!ingredient) return null;
                return (
                  <li key={customization.ingredientId}>
                    • {ingredient.name} — {customization.reason}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {recommendation.excludedIngredients.length > 0 && (
          <div>
            <p className="text-foreground text-sm font-medium">Not included</p>
            <ul className="text-muted-foreground mt-1 flex flex-col gap-1 text-sm">
              {recommendation.excludedIngredients.map((exclusion) => (
                <li key={exclusion.ingredientId}>• {exclusion.reason}</li>
              ))}
            </ul>
          </div>
        )}

        <Button type="button" onClick={handleApply} className="self-start">
          Apply to Customizer
        </Button>
      </CardContent>
    </Card>
  );
}

export function RecommendationPanelSkeleton() {
  return (
    <Card className="border-border border">
      <CardContent className="flex flex-col gap-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );
}
