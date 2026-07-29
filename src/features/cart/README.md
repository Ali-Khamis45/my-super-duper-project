# cart

The Premium Ordering Experience: a real `localStorage`-backed cart built on `RecipeSnapshot` — a complete, self-contained copy of a composed drink, not a reference back to live customizer state. Add to Cart (from `/customize`), the mini-cart, the full `/cart` page, `/checkout`, and `/checkout/confirmation` all read and write the same model. Follows the `hero-cup/README.md` template — Architecture, Flow, Responsibilities, Future Extension.

## Architecture

```
cart/
├── components/
│   ├── AddToCartButton.tsx   builds a snapshot, adds it, "flies" to the cart icon
│   ├── CartIcon.tsx          navbar trigger — badge count, registers cartIconAnchor
│   ├── MiniCart.tsx          Sheet-based quick preview
│   ├── CartExperience.tsx    the full /cart page
│   ├── CheckoutExperience.tsx  /checkout — order summary + name/email form
│   ├── OrderConfirmation.tsx   /checkout/confirmation — the premium reveal
│   ├── CartItemRow.tsx       one line, shared by MiniCart (compact) and /cart (full)
│   ├── PriceBreakdown.tsx    memoized per-line + total pricing
│   └── CartAnnouncer.tsx     sr-only aria-live region
├── lib/
│   ├── buildRecipeSnapshot.ts   the one place live customizer state becomes a durable snapshot
│   └── cartIconAnchor.ts        a bridge-store DOM-position handoff for the fly-to-cart animation
└── types.ts
```

Cart state (`items`/`favorites`/`lastOrder`) lives in `stores/cart-store.ts` (project-root `stores/`, same convention every prior feature store here follows) — `localStorage`-backed, per [18_ENGINEERING_CONTRACTS.md](../../../docs/18_ENGINEERING_CONTRACTS.md)'s pre-designed Cart store contract (written at the Architecture Freeze, built to now almost exactly, extended additively for this sprint's much richer brief).

## The Recipe Snapshot model

`RecipeSnapshot` mirrors `customizer-store`'s own live shape — `baseDrinkId`/`baseDrinkCategory` plus the full `CustomizerSelection` (color/size/sleeve/lid/logo/material/ingredients) — plus a few durable, denormalized fields: `baseDrinkName` and `unitPrice`, frozen at the moment the snapshot is built so a later catalog change never silently rewrites what's already in someone's cart, and `appliedRecommendationId`, carrying forward whichever AI recommendation (if any) this recipe traces back to. "Layer order" is never a separate field — `selection.ingredients`' own array order already *is* stack order (`features/composer/lib/resolveIngredientLayers.ts` reads it directly), so duplicating it would be exactly the parallel model the brief forbids.

Building one (`buildRecipeSnapshot`) and restoring one (`customizer-store`'s `loadRecipeSnapshot`) are exact inverses — "no data transformations or state reconstruction" in either direction, the brief's own words, checked directly rather than just intended.

## Flow

1. `AddToCartButton` lives at the bottom of `features/customizer/`'s `CustomizerPanel` — it reads the live `customizer-store` selection, builds a `RecipeSnapshot` via `buildRecipeSnapshot`, and calls `cart-store`'s `addItem`. An identical existing recipe (same drink, same selection, same recommendation link) merges into that line's quantity instead of duplicating it.
2. `CartIcon` (navbar, every route) shows a real item-count badge and registers its own DOM node with `cartIconAnchor` (a `createBridgeStore` instance, the same cross-component-tree-boundary pattern `useCupKeyboardControls`'s `keyboardRotationDelta` established) so `AddToCartButton` has a real target position to animate a "flying" ghost element toward.
3. `MiniCart` (the icon's `Sheet`) and the full `/cart` page (`CartExperience`) both render the same `CartItemRow`/`PriceBreakdown` components — a compact, read-mostly mode for the mini-cart, full quantity/remove/favorite/edit controls on the full page.
4. "Edit" calls `customizer-store`'s `loadRecipeSnapshot` (rehydrating `selection`/`baseDrinkId`/`baseDrinkCategory`/`appliedRecommendationId` all at once) and navigates to `/customize?drink=<id>` — the same real routing Sprint 3.3/3.5 already established.
5. `/checkout` (`CheckoutExperience`) shows the order summary and a minimal name/email form; "Place Order" calls `cart-store`'s `placeOrder()` (builds a `CompletedOrder`, clears the cart, emits `checkout:completed`) and navigates to `/checkout/confirmation`, which reads `lastOrder` for its premium reveal.

## Responsibilities

- **This feature owns**: the `RecipeSnapshot`/`CartItem`/`CompletedOrder` models, cart/favorites/order session state, the fly-to-cart animation, its own cart/checkout/confirmation UI.
- **This feature borrows from `stores/customizer-store.ts`**: the live selection `AddToCartButton` snapshots, and `loadRecipeSnapshot` for editing — never a duplicated selection model.
- **This feature borrows from `features/composer/`**: `calculateIngredientsTotal` (extracted this sprint from `RecipeSummary.tsx` specifically so pricing is computed exactly once, not twice).
- **This feature borrows from `features/menu/`**: `resolveDrink`, for the same "never a second drink dataset" reason every prior feature here follows.
- **This feature does not own**: the customizer's own selection state, ingredient compatibility rules, or the 3D cup — all read from their owning feature.

## Known simplifications

- Checkout collects name/email only — no payment fields. This project has no backend or payment gateway; building fake card-number inputs would be actively misleading rather than a real "premium" flow, the same honesty this project's other simulated-but-transparent systems (the AI Concierge's rule engine, Sprint 3.4's "not a physics engine") already establish.
- Favorites/`lastOrder` are `localStorage`-persisted alongside cart items for simplicity, not literally erased at tab-close — "session only" in the brief is read here as "no server account," matching `stores/cart-store.ts`'s own doc comment.

## Future extension

- **A real backend/account system**: `RecipeSnapshot`/`CompletedOrder` are already shaped to be the contract a future order-history/account feature would consume directly — "linking orders to the account for future use," the brief's own words, is a real, enabled seam, not a promise requiring a reshape later.
- **A real payment gateway**: `CheckoutExperience`'s form is the one place a real payment step would slot in, without touching the cart model itself.
