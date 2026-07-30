# menu

The Product Catalog Experience: browse, search, filter, and inspect drinks before ordering. Follows the `hero-cup/README.md` template — Architecture, Flow, Responsibilities, Future Extension.

## Architecture

```
menu/
├── components/
│   ├── MenuExperience.tsx    "use client" — page composition, live query wiring, analytics
│   ├── MenuSearch.tsx        search input (controlled, wired to useSearchStore)
│   ├── CategoryFilter.tsx    toggle-button group; fetches its own live category list
│   ├── DrinkCard.tsx         one catalog entry — GlowCard wrapped in a real <button>
│   ├── DrinkDetailDialog.tsx the sitemap's Menu → Product Detail node, scoped to a dialog not a route
│   ├── MenuEmptyState.tsx    real copy for a zero-result search/filter
│   ├── MenuLoadingState.tsx  card-shaped skeleton grid — this feature's first real async data dependency
│   └── MenuErrorState.tsx    a distinct state from "no results" — a failed fetch needs "retry," not "try a different search"
├── data/{categories,drinks}.ts   kept, unmodified — see "Sprint 5.2 update" below for why
├── hooks/{useMenuQuery,useCategoriesQuery,useSearchQuery}.ts   TanStack Query wrappers around the real Catalog API
├── lib/{mapProductToDrink,categoryIcons}.ts   backend DTO → frontend view-type mapping, plus the frontend-only icon lookup no DTO carries
└── types.ts                       Drink / DrinkCategory contracts
```

## Sprint 5.2 update — real backend, not a rewrite

`/menu` now fetches its catalog from `Coffeshop.Api` (`GET /api/v1/menu`, `GET /api/v1/categories`, `GET /api/v1/search`) instead of importing `data/drinks.ts`/`data/categories.ts` directly. Those two files are **kept, unmodified** — they're still the real, correct data source for `resolveDrink()`/`resolveCategory()`, still exercised by their own existing unit tests, and still the icon lookup every mapped category ultimately draws from (`lib/categoryIcons.ts` is the same icon table, extracted). Nothing about "replace the static catalog completely" (this sprint's own brief) required deleting a file whose *data* is now redundant but whose *icon table and slug-format precedent* are exactly what keeps `cart-store`/`customizer-store`/`recommendationEngine`'s existing string-matching logic — and every test written against it — working with zero regressions.

The real seam: `Drink.id` is still the stable kebab-case string every existing consumer keys on (`"classic-espresso"`), derived client-side from the backend's `Name` field (`slugify()`, verified byte-identical to all 14 real seeded products) rather than serialized as the backend's actual `Guid` — which is carried separately as the new, optional `Drink.productId` field for anything that needs to call back to the API. Search (`MenuSearch`) is now real, ranked PostgreSQL full-text search via `useSearchQuery` (debounced), not a local substring filter — the `menu_searched` analytics event's *meaning* didn't change, only what powers it.

## Flow

1. `app/menu/page.tsx` renders `MenuExperience` (client).
2. `MenuExperience` calls `useMenuQuery()` (hydrates `useMenuStore`) and, when the search box has real text, `useSearchQuery(query)` instead; `query`/`category` live in `useSearchStore`/local state, `filtered` is a `useMemo` derivation over whichever list is active.
3. `CategoryFilter` fetches its own category list (`useCategoriesQuery`, hydrates `useCategoryStore`) rather than receiving it as a prop — the one real consumer, so there's no value in a parent fetching just to hand it down.
4. `DrinkCard.onSelect` opens `DrinkDetailDialog` — its "Customize this drink" CTA links to `/customize?drink=<id>`, which `CustomizerExperience` resolves against the same live-fetched menu list.
5. Loading/error states are real, not assumed: `MenuLoadingState` (skeleton grid) while the first fetch is in flight, `MenuErrorState` (with retry) on a failed request — this feature's static-data era never needed either, since a bundled array has no latency and cannot fail.

## Responsibilities

- **This feature owns**: query hooks, the DTO→view-type mapping (`slugify`, `productSummaryToDrink`, `categoryDtoToDrinkCategory`), search/filter/detail-view UI state, its own analytics events.
- **This feature borrows from `engine/`/`design-system/`**: `GlowCard`, motion presets, `usePrefersReducedMotion`, `track()`.
- **This feature does not own**: the Navbar, design tokens, the 3D rendering engine, or the backend itself (`backend/src/Coffeshop.Api`, a separate Clean Architecture solution — see [docs/41_BACKEND_DEVELOPMENT_STANDARDS.md](../../../docs/41_BACKEND_DEVELOPMENT_STANDARDS.md)).

## Update (Sprint 3.8, Final Polish)

`CategoryFilter` harmonized onto `role="radiogroup"`/`role="radio"`/`aria-checked` (was `aria-pressed`) — a dedicated audit found this single-select group was using the toggle-button semantics meant for independently-togglable controls, misleading since selecting one category always deselects another. Matches the pattern `features/customizer/`'s `VariantSwatchGroup` already established for the same "pick exactly one" shape.

## Known simplifications

- No routed product-detail page — a dialog, scoped to what Sprint 3.1's brief actually named ("Categories," "Search," "Filtering," not "Product Detail Pages"). Still true post-5.2.
- No live 3D preview per drink — that's the Live Cup Customizer's job (Sprint 3.2), not duplicated here.
- No Redis read-through cache in front of the catalog reads — not built (Sprint 5.2), since a 14-product catalog has no real justification for one yet; the backend's own PostgreSQL indexes (see `docs/reviews/sprint-5.2-review.md`) are the real answer at this scale.

## Future extension

- **Sprint 3.6 (Commerce)**: an "Add to cart" action belongs on `DrinkCard`/`DrinkDetailDialog` once a cart concept exists.
- **Sprint 5.3 (Ordering)**: `Drink.productId` (the real backend Guid, added Sprint 5.2) is what a real order line will reference — named ahead of need, not built ahead of it.
- **A featured-drinks home page section**: `GetFeaturedQuery`/`/api/v1/featured` already exist backend-side (real, tested), but `menu-client.ts`'s `getFeatured()` client function was deliberately removed once written, since nothing calls it — no featured section exists on the home page yet. Re-add it the same milestone a real one gets built, not before.
