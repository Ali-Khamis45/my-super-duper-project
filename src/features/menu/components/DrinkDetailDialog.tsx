"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { resolveCategory } from "../data/categories";
import type { Drink } from "../types";

interface DrinkDetailDialogProps {
  drink: Drink | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * The sitemap's Menu → Product Detail node (`docs/strategy/sitemap.md`),
 * scoped to what Sprint 3.1 (Product Catalog Experience) actually calls
 * for — a real detail view, not a full routed product page, which stays
 * out of scope until the Live Cup Customizer (Sprint 3.2) gives "Customize
 * this drink" somewhere real to go. The CTA below links to `/customize`,
 * which is still its Milestone-4-era placeholder — an honest link to a
 * real future page, not a dead end invented for this dialog.
 */
export function DrinkDetailDialog({ drink, onOpenChange }: DrinkDetailDialogProps) {
  const category = drink ? resolveCategory(drink.category) : null;

  return (
    <Dialog open={drink !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {drink && category && (
          <>
            <DialogHeader>
              <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                <category.icon className="size-3.5" aria-hidden="true" />
                {category.label}
              </div>
              <DialogTitle className="font-display text-xl">{drink.name}</DialogTitle>
              <DialogDescription className="text-foreground text-base text-balance">
                {drink.description}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-between">
              <span className="font-display text-brand-accent-600 dark:text-brand-accent-400 text-lg">
                ${drink.price.toFixed(2)}
              </span>
              <span className="text-muted-foreground text-xs">{drink.tags.join(" · ")}</span>
            </div>
            <DialogFooter>
              <Button variant="outline" nativeButton={false} render={<Link href="/customize" />}>
                Customize this drink
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
