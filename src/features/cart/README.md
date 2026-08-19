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
│   ├── PaymentProcessing.tsx   /checkout/payment — the real charge step (Sprint 5.5)
│   ├── OrderConfirmation.tsx   /checkout/confirmation — the premium reveal, now post-payment
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
5. `/checkout` (`CheckoutExperience`) shows the order summary and a minimal name/email form; "Place Order" calls `cart-store`'s `placeOrder()` — since Sprint 5.3, a real `POST /api/v1/orders` call (`lib/order-client.ts`), not a locally-fabricated record — clears the cart, emits `checkout:completed`. Since Sprint 5.5, that's not the last step: it immediately starts a real payment session (`createCheckoutSession`, `lib/payment-client.ts`) against the new order and navigates to `/checkout/payment`, not straight to confirmation.
6. `/checkout/payment` (`PaymentProcessing`) is where the actual charge happens — real `IPaymentGateway` call server-side (`FakePaymentGateway` in this environment; see [34_PAYMENTS_NOTIFICATIONS_SEARCH.md](../../../docs/34_PAYMENTS_NOTIFICATIONS_SEARCH.md)'s own Sprint 5.5 status note for the disclosed Stripe-unverified gap). Reads `lastOrder`/`lastPaymentId` from `cart-store` (not URL params), so a refresh, a back-button return, or a second tab all resolve against the same real `Payment` — every call here is genuinely idempotent server-side. On success it redirects to `/checkout/confirmation`; on decline/error it shows a real retry/cancel UI in place, no route change.
7. `/checkout/confirmation` (`OrderConfirmation`) now only renders after the payment actually succeeded, reading both `lastOrder` and `lastPaymentId` (the real `OrderDto`/`Payment.Id` the backend returned) for its premium reveal, plus a link to the real receipt (`/payments/[id]`, `features/payments/`).

## Responsibilities

- **This feature owns**: the `RecipeSnapshot`/`CartItem` models, cart/favorites session state, the fly-to-cart animation, its own cart/checkout/confirmation UI. `CompletedOrder` (a Sprint 3.6-era local, fabricated order record) is gone as of Sprint 5.3 — `cart-store.ts`'s `lastOrder` field now holds the real `OrderDto` `features/orders/` also reads.
- **This feature borrows from `stores/customizer-store.ts`**: the live selection `AddToCartButton` snapshots, and `loadRecipeSnapshot` for editing — never a duplicated selection model.
- **This feature borrows from `features/composer/`**: `calculateIngredientsTotal` (extracted this sprint from `RecipeSummary.tsx` specifically so pricing is computed exactly once, not twice).
- **This feature borrows from `features/menu/`**: `resolveDrink`, for the same "never a second drink dataset" reason every prior feature here follows.
- **This feature does not own**: the customizer's own selection state, ingredient compatibility rules, or the 3D cup — all read from their owning feature.

## Known simplifications

- Checkout still collects name/email only — no card-number fields render anywhere in this feature. That's not a gap as of Sprint 5.5, it's the correct PCI-safe shape: a real card gateway's own client-side SDK (Stripe Elements, in a real deployment) would collect card details directly, never through this project's own form fields — see [36_SECURITY_MODEL.md](../../../docs/36_SECURITY_MODEL.md)'s own Payments security section. `FakePaymentGateway` (this environment's active gateway) needs no card input at all, resolving synchronously server-side from the charge amount alone.
- Favorites/`lastOrder`/`lastPaymentId` are `localStorage`-persisted alongside cart items for simplicity, not literally erased at tab-close — "session only" in the brief is read here as "no server account," matching `stores/cart-store.ts`'s own doc comment.
- `FakePaymentGateway`'s decline/provider-error simulation (magic amount cents `.13`/`.14`) is unreachable through any real checkout composed from this project's own catalog — every price/modifier is a multiple of $0.05. This feature's own declined/failed UI states (`PaymentProcessing.tsx`) are real and tested (`PaymentCommandHandlerTests.cs`, gateway mocked directly), just not exercisable end-to-end through a real browser session with real menu items.

## Update (Sprint 5.3, Ordering Platform)

`placeOrder()` now calls the real backend (`lib/order-client.ts`) instead of fabricating a `CompletedOrder` locally — see `features/orders/README.md` for the full order-lifecycle feature this unlocked (My Orders, Order Details, Order Timeline). Two real, additive changes this required here:

- **`RecipeSnapshot` gained a required `productId` field** (the real backend `Product.Id`) — `buildRecipeSnapshot.ts` now returns `null` if it's missing, the same "never fabricate a snapshot for a drink that doesn't exist" rule it already applied to an unresolvable `baseDrinkId`, now also covering "unresolvable against the *live* catalog." `AddToCartButton`'s own button is disabled until `customizer-store`'s `baseDrinkProductId` resolves (a real, brief loading state on first mount, not a silent no-op).
- **A real, live-verified double-submission bug** (two concurrent identical checkout requests created two separate orders) is closed by a client-generated `idempotencyKey`, generated once per `/checkout` page mount (`CheckoutExperience.tsx`'s own `useState` initializer) and threaded through `placeOrder()` — stable across the same "Place Order" intent, not regenerated per click, so a genuine double-click or retry reuses it. See `Order.IdempotencyKey`'s own doc comment and [docs/reviews/sprint-5.3-review.md](../../../docs/reviews/sprint-5.3-review.md).

## Update (Sprint 3.8, Final Polish)

A dedicated audit found and fixed three real motion-token violations: `OrderConfirmation`'s checkmark reveal used a hand-rolled overshoot cubic-bezier duplicating exactly what `engine/motion/springs.ts`'s `bouncy` preset ("Playful overshoot — pop/press feedback") already exists for; `AddToCartButton`'s fly-to-cart animation and `CartIcon`'s badge-pop each had their own hardcoded duration/easing instead of the shared `durations`/`easings`/`springs` tokens. All three now draw from the project's one motion-token source. Also fixed: a missing `useMemo` on `MiniCart`'s total (matching `PriceBreakdown`'s own stated requirement for the identical computation), a missing `aria-pressed` on the favorites-section remove button (matching `CartItemRow`'s own favorite toggle), and the empty-cart/empty-checkout/no-recent-order states — previously a small, sparse dashed box in a mostly-empty page — given real visual presence (larger icon, two-line message, subtle background tint), verified by screenshot.

Found, not fixed this sprint: `reorderItem` (`cart-store.ts`) is a real, tested store action with zero UI callers — no up/down control exists anywhere in `CartItemRow`/`CartExperience`/`MiniCart`. Flagged in [RC1_RELEASE_CANDIDATE_REPORT.md](../../../docs/RC1_RELEASE_CANDIDATE_REPORT.md)'s Technical Debt section rather than either wired up under time pressure or removed without checking whether cart-line reordering is still a wanted feature.

## Update (Sprint 5.5, Payments Platform)

The "real payment gateway" item this section used to name under Future Extension is done. `CheckoutExperience` no longer navigates straight from "Place Order" to confirmation — it starts a real payment session and hands off to a new step, `PaymentProcessing.tsx` (`/checkout/payment`), before confirmation is ever reached. See `features/payments/README.md` for the full Payment History/Receipt feature this unlocked, and this README's own Flow section above for the updated 7-step sequence.

Two real, additive changes this required here, matching `lastOrder`'s own established pattern:

- **`cart-store.ts` gained `lastPaymentId`/`setLastPaymentId`**, persisted the same way `lastOrder` is — what makes "refresh during checkout," "back button to `/checkout/payment`," and "second tab" all real, working scenarios instead of dead ends: the page re-derives its state by re-fetching the same real `Payment` (`getPayment`/`confirmPayment`, both idempotent server-side), never from a URL param or component state a reload would lose.
- **`OrderConfirmation`'s copy changed from "Order confirmed" to "Payment confirmed"** — a deliberate, meaningful distinction now that this page is only reachable after a real charge succeeded, not merely after the order was submitted. Existing e2e assertions (`cart.spec.ts`/`orders.spec.ts`) were updated to match, not left pointing at stale copy.

A real bug found via this feature's own live/Playwright verification, fixed in the backend, not here: awaiting the order-confirmation email's full SMTP round trip inline blocked the `/checkout/payment` → confirmation redirect long enough that a real browser aborted the request under load — the payment itself had already succeeded, but the customer never saw it. See `ConfirmPaymentCommand`'s own doc comment and [docs/reviews/sprint-5.5-review.md](../../../docs/reviews/sprint-5.5-review.md).
