"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Heart, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { fadeIn, fadeUp } from "@/engine/motion/presets";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { selectCartItemCount, useCartStore } from "@/stores/cart-store";

import { CartItemRow } from "./CartItemRow";
import { PriceBreakdown } from "./PriceBreakdown";

/**
 * The full `/cart` page — everything `MiniCart` intentionally keeps
 * compact: real quantity editing, per-item Edit (back into the
 * customizer), a full price breakdown, and the session's favorited
 * recipes (each re-addable in one click via `addFavoriteToCart` — "reuse
 * existing... models," not a second favorites-rendering path).
 */
export function CartExperience() {
  const items = useCartStore((state) => state.items);
  const favorites = useCartStore((state) => state.favorites);
  const addFavoriteToCart = useCartStore((state) => state.addFavoriteToCart);
  const toggleFavorite = useCartStore((state) => state.toggleFavorite);
  const reducedMotion = usePrefersReducedMotion();
  const itemCount = selectCartItemCount(items);
  const headingRef = useRef<HTMLHeadingElement>(null);

  return (
    <div id="main-content" className="mx-auto max-w-3xl px-4 pt-24 pb-16 sm:px-6">
      <h1 ref={headingRef} className="font-display mb-6 text-2xl">
        Your Cart
      </h1>

      <AnimatePresence mode="wait">
        {items.length === 0 ? (
          <motion.div
            key="empty"
            initial={reducedMotion ? false : "hidden"}
            animate={reducedMotion ? undefined : "visible"}
            variants={fadeIn}
            className="text-muted-foreground flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center"
          >
            <ShoppingBag className="size-10 opacity-40" aria-hidden="true" />
            <p>Your cart is empty.</p>
            <Button nativeButton={false} render={<Link href="/menu" />}>Browse the menu</Button>
          </motion.div>
        ) : (
          <motion.div key="items" initial={reducedMotion ? false : "hidden"} animate={reducedMotion ? undefined : "visible"} variants={fadeUp} className="flex flex-col gap-6">
            <Card>
              <CardContent className="divide-border divide-y">
                {items.map((item) => (
                  <CartItemRow key={item.snapshot.id} item={item} />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <PriceBreakdown items={items} />
              </CardContent>
            </Card>

            <Button type="button" size="lg" className="self-start" nativeButton={false} render={<Link href="/checkout" />}>
              Proceed to Checkout ({itemCount} item{itemCount === 1 ? "" : "s"})
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {favorites.length > 0 && (
        <div className="mt-10">
          <Separator className="mb-6" />
          <h2 className="font-display mb-3 text-lg">Favorites</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {favorites.map((snapshot) => (
              <Card key={snapshot.id}>
                <CardContent className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{snapshot.baseDrinkName}</p>
                    <p className="text-muted-foreground text-xs">${snapshot.unitPrice.toFixed(2)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${snapshot.baseDrinkName} from favorites`} onClick={() => toggleFavorite(snapshot)}>
                      <Heart className="fill-brand-accent-500 text-brand-accent-500 size-3.5" aria-hidden="true" />
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => addFavoriteToCart(snapshot.id)}>
                      Add to cart
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
