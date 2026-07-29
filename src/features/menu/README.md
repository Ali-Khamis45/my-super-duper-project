# menu

The Product Catalog Experience: browse, search, filter, and inspect drinks before ordering. Follows the `hero-cup/README.md` template — Architecture, Flow, Responsibilities, Future Extension.

## Architecture

```
menu/
├── components/
│   ├── MenuExperience.tsx    "use client" — page composition, search/filter state, analytics
│   ├── MenuSearch.tsx        search input
│   ├── CategoryFilter.tsx    toggle-button group (Button + aria-pressed, not a new tabs primitive)
│   ├── DrinkCard.tsx         one catalog entry — GlowCard wrapped in a real <button>
│   ├── DrinkDetailDialog.tsx the sitemap's Menu → Product Detail node, scoped to a dialog not a route
│   └── MenuEmptyState.tsx    real copy for a zero-result search/filter
├── data/{categories,drinks}.ts   static, typed, first-party catalog data — no backend exists (ADR-0005)
└── types.ts                       Drink / DrinkCategory contracts
```

No `hooks/` or `registry/` folder — search/filter is local `useState` + `useMemo` derivation (ADR-0005: "interaction state machines are local component/hook state," and this isn't even a state machine, just synchronous filtering of a static array). No async loading state exists because there's nothing to load asynchronously.

## Flow

1. `app/menu/page.tsx` renders `MenuExperience` (client — needs `useState` for search/filter/dialog state from the first render).
2. `MenuExperience` holds `query`/`category`/`selectedDrink` state, derives `filtered` via `useMemo`, and renders the header, `CategoryFilter` + `MenuSearch` row, the drink grid (or `MenuEmptyState`), and `DrinkDetailDialog`.
3. `DrinkCard.onSelect` sets `selectedDrink`, opening `DrinkDetailDialog` — its "Customize this drink" CTA links to `/customize` (Sprint 3.2's real future page, not a placeholder invented for this dialog).
4. Search-settled and category-change events fire through `engine/analytics/tracking.ts`'s `track()` directly (the same pattern `ThemeToggle`/`MobileMenu` already use for DOM-only interactions — no EventBus involvement, since nothing outside this feature needs to react to a search term).

## Responsibilities

- **This feature owns**: the catalog data, search/filter/detail-view state, its own analytics events.
- **This feature borrows from `engine/`/`design-system/`**: `GlowCard`, motion presets (`fadeUp`/`stagger`/`fadeIn`), `usePrefersReducedMotion`, `track()`.
- **This feature does not own**: the Navbar, design tokens, or the 3D rendering engine — Sprint 3.1's brief is explicitly "Menu · Drinks · Categories · Search · Filtering," not a 3D preview per drink (that's a live-customizer-era concern, Sprint 3.2+, not invented ahead of it here).

## Update (Sprint 3.8, Final Polish)

`CategoryFilter` harmonized onto `role="radiogroup"`/`role="radio"`/`aria-checked` (was `aria-pressed`) — a dedicated audit found this single-select group was using the toggle-button semantics meant for independently-togglable controls, misleading since selecting one category always deselects another. Matches the pattern `features/customizer/`'s `VariantSwatchGroup` already established for the same "pick exactly one" shape.

## Known simplifications

- No real backend/CMS — `data/drinks.ts` is static, typed, first-party data, the same category of honest stand-in as the hero cup's procedural geometry.
- No routed product-detail page — a dialog, scoped to what this sprint's brief actually named ("Categories," "Search," "Filtering," not "Product Detail Pages").
- No live 3D preview per drink — that's the Live Cup Customizer's job (Sprint 3.2), not duplicated here ahead of it.

## Future extension

- **Sprint 3.2**: the customizer CTA in `DrinkDetailDialog` gets a real destination beyond the placeholder `/customize` page; a drink's chosen customization options likely flow back into a cart/order concept (Sprint 3.6).
- **Sprint 3.6 (Commerce)**: an "Add to cart" action belongs on `DrinkCard`/`DrinkDetailDialog` once a cart concept exists — not stubbed here ahead of that sprint.
- **A real backend**: if/when one exists, `data/drinks.ts`'s shape (`Drink`/`DrinkCategory` in `types.ts`) is the contract a real fetch would need to satisfy — the migration point is named, not built ahead of need, per ADR-0005.
