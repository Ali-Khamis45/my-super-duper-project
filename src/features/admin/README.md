# admin

Protected internal tooling for managing the Catalog: products (full CRUD, Draft→Published→Archived lifecycle, pricing, category assignment, availability, images-by-URL), categories, and ingredients. This project's first protected route — Sprint 5.1 shipped authentication but never built a page that actually required it. Follows the `hero-cup/README.md` template — Architecture, Flow, Responsibilities, Future Extension.

## Architecture

```
admin/
├── components/{AdminNav,AccessDenied}.tsx
├── hooks/useRequireManageProducts.ts        the permission guard
├── products/
│   ├── components/{ProductTable,ProductFilters,ProductEditor,CreateProductForm}.tsx
│   ├── hooks/{useAdminProductsQuery,useAdminProductQuery,useProductMutations}.ts
│   └── lib/formatCategoryCode.ts
├── categories/
│   ├── components/CategoryManager.tsx
│   └── hooks/{useAdminCategoriesQuery,useCategoryMutations}.ts
└── ingredients/
    ├── components/IngredientManager.tsx
    └── hooks/{useAdminIngredientsQuery,useIngredientCategoriesQuery,useIngredientMutations}.ts
```

Routes live at `app/admin/{layout,products/page,products/new/page,products/[id]/page,categories/page,ingredients/page}.tsx` — `app/admin/layout.tsx` is the one place the guard is applied; every page underneath it is automatically protected, not individually gated.

## Why the admin-facing hooks don't reuse the customer-facing ones

`features/menu/hooks/useCategoriesQuery`/`features/composer/hooks/useIngredientsQuery` map `CategoryDto`/`IngredientDto` to the customer-facing `DrinkCategory`/`Ingredient` shapes — both deliberately discard the real database `Guid` and (for categories) `sortOrder`, since no customer-facing UI needs either. The admin editors need exactly what those hooks throw away (`updateCategory(id, ...)`/`updateIngredient`'s `sortOrder` round-trip both require the real values), so `useAdminCategoriesQuery`/`useAdminIngredientsQuery` fetch the *raw* DTOs instead — sharing the same `["categories"]`/`["ingredients"]` TanStack Query cache key as their customer-facing counterparts (so a save from either side invalidates both), but never sharing a mapping function that would have to serve two incompatible shapes.

## Flow

1. `app/admin/layout.tsx` calls `useRequireManageProducts()` — `"checking"` while `AuthSessionRestorer`'s silent refresh is still in flight, `"unauthenticated"` redirects to `/login` (client-side, not middleware — the real access token lives only in an in-memory module variable `auth-client.ts` established in Sprint 5.1, which no server middleware can see), `"forbidden"` renders `AccessDenied` (authenticated, but missing the `products:manage` permission), `"allowed"` renders `AdminNav` + the page.
2. `/admin/products` (`ProductTable` + `ProductFilters`) reads `useAdminProductsQuery(filter)` — real server-side filtering/pagination/search (`ProductFilter.SearchTerm`, additive this sprint, a plain `ILIKE` on `Name` — deliberately not routed through the ranked full-text `/search` endpoint, which only returns Published/available rows and would hide Drafts from an admin search).
3. `/admin/products/new` (`CreateProductForm`) posts `CreateProductCommand`; `/admin/products/{id}` (`ProductEditor`) is several independent sections, each mapping to exactly one backend mutation (Details → `UpdateProductCommand`, Pricing → `UpdatePricingCommand`, Category → `AssignCategoryCommand`, Availability → `UpdateAvailabilityCommand`, status actions → `Publish`/`Archive`/`Restore`/`DeleteProductCommand`, Images → `UploadImageCommand`/`RemoveImageCommand`). Season/Temperature/Type are shown read-only — no update command exists for them; they're set once at creation and immutable after, matching real backend capability, not an oversight.
4. Every mutation (`useProductMutations`/`useCategoryMutations`/`useIngredientMutations`) invalidates its own admin query family **and** the customer-facing `["menu"]`/`["search"]`/`["categories"]`/`["ingredients"]` caches — an admin publishing a product should be reflected on `/menu` on next visit, not just in the admin session that made the change.

## Responsibilities

- **This feature owns**: the permission guard, every admin CRUD form/table, admin-specific query hooks and mutations.
- **This feature borrows from `features/menu/`/`features/composer/`**: nothing at the component level — the customer-facing and admin-facing surfaces are fully independent UIs over the same backend, sharing only TanStack Query cache keys (see above) so mutations from one are visible to the other.
- **This feature does not own**: the backend (`backend/src/Coffeshop.Api`), the customer-facing `/menu`/`/customize`/`/concierge` pages, or `auth-store.ts`/`auth-client.ts` (Sprint 5.1's, read here, never modified).

## Known simplifications

- Image management is by URL, not a file upload — the real backend surface is `AddImageRequest(Url, AltText, IsPrimary)`; no blob/object storage exists in this architecture (see `docs/29_COMMERCE_ARCHITECTURE_FREEZE.md`), so a file-picker UI with nothing behind it would have been exactly the "placeholder implementation" this sprint's brief forbids.
- No bulk actions beyond "Archive selected" — the one bulk action broadly meaningful across a mixed selection (Publish only applies to Drafts, Restore only to Archived, Delete only to Drafts); building four narrowly-applicable bulk buttons for this sprint's scope would have been speculative surface with unclear real use.
- Anonymous visitors and non-admins both land on real, distinct states (`/login` redirect vs. `AccessDenied`) — no generic "not found" masking, since this is an internal tool, not a security boundary that benefits from hiding its own existence.

## Future extension

- **Sprint 5.4 (Administration Platform)**: this feature's `AdminNav`/`useRequireManageProducts` guard shell is the one Sprint 5.4 extends with new sections (`/admin/orders`, `/admin/content`, `/admin/coupons`, `/admin/users`) — never rebuilt, per `docs/39_COMMERCE_IMPLEMENTATION_READINESS.md`'s Sprint 5.4 row.
- **A real featured-drinks toggle in the UI**: `SetFeaturedCommand`/`PUT /api/v1/products/{id}/featured` exist backend-side (real, tested), but no frontend client function calls it yet — same "no zero-consumer scaffolding" reasoning `menu-client.ts`'s own note on `getFeatured` explains: no featured section exists on the customer-facing home page to make a featured toggle meaningful yet, so the client-side write path was left unbuilt rather than added speculatively. Add both together the same milestone a real featured section gets built.
