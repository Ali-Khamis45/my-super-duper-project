# orders

Sprint 5.3 — the customer-facing half of the Ordering Platform: My Orders, Order Details, and Order Timeline, reading the real backend (`Coffeshop.Domain.Ordering.Order`) via `lib/order-client.ts`. Follows the `hero-cup/README.md` template — Architecture, Flow, Responsibilities, Future Extension.

## Architecture

```
orders/
├── components/
│   ├── MyOrdersList.tsx       /orders — paginated list, real empty/loading/error states
│   ├── OrderDetails.tsx       /orders/[id] — full order, items, cancel action
│   ├── OrderTimeline.tsx      the append-only status history, shared with features/admin/orders/
│   └── OrderStatusBadge.tsx   status→label/variant mapping, shared with features/admin/orders/
└── hooks/
    ├── useMyOrdersQuery.ts
    ├── useOrderQuery.ts
    └── useCancelOrderMutation.ts
```

Routes: `app/orders/layout.tsx` (the `useRequireAuth` guard — any authenticated account, not a specific permission, since a customer views only their own orders), `app/orders/page.tsx`, `app/orders/[id]/page.tsx`.

## Flow

1. `useCartStore`'s `placeOrder()` (`features/cart/`) submits the cart to `POST /api/v1/orders`; on success, `OrderConfirmation.tsx` links to `/orders`.
2. `/orders` (`MyOrdersList`) calls `GET /api/v1/orders/me` — every order the authenticated caller owns, newest first, paginated. Guest orders never appear here — there's no account for them to belong to (`useMyOrdersQuery`'s own backing query, `GetMyOrdersQuery`, has no guest path at all).
3. Clicking an order navigates to `/orders/[id]` (`OrderDetails`), which calls `GET /api/v1/orders/{id}` — the full aggregate: items, totals, and the real `OrderTimeline`. A non-owner gets the exact same "not found" state a bad id would (`GetOrderQuery`'s own ownership-or-staff-permission check never returns a distinguishing 403 — see that handler's own doc comment) — never confirms an order exists to someone with no business knowing that.
4. "Cancel order" appears only when the order's current status is one `Order.Cancel()` actually accepts (`draft`/`submitted`/`paid` — mirrored client-side from that method's own doc comment, so the button is never shown for a transition the backend would 409 a moment later) and calls `POST /api/v1/orders/{id}/cancel`.

## Responsibilities

- **This feature owns**: the customer-facing order list/detail UI, its own query/mutation hooks, `OrderStatusBadge`/`OrderTimeline` (shared with `features/admin/orders/`, which imports them directly rather than duplicating the status→label mapping).
- **This feature borrows from `lib/order-client.ts`**: every network call and the `OrderDto`/`OrderSummaryDto`/`OrderTimelineEntryDto` types — never a second copy of the wire shape.
- **This feature does not own**: order creation (`features/cart/`'s `placeOrder()`), order status transitions beyond cancel (`features/admin/orders/`'s staff-only pay/complete/fail actions).

## Known simplifications

- No pagination beyond page/pageSize buttons — no infinite scroll, since a customer's own order history is realistically small.
- No real-time updates (no SignalR/polling) — an order's status only changes via a page reload or revisit. `useCancelOrderMutation`/`features/admin/orders/`'s own mutations do update the shared TanStack Query cache on success, so a cancel action reflects immediately in the same session without a full reload.

## Future extension

- **Real-time order status**: a SignalR connection pushing status changes would slot into `useOrderQuery`'s existing `queryClient.setQueryData` pattern without restructuring this feature.
- **Guest order lookup**: no "look up my guest order by number + email" flow exists — a guest's only real record today is the confirmation page itself (see `GetMyOrdersQuery`'s own doc comment). A real one would be a new, small addition here, not a rework.
