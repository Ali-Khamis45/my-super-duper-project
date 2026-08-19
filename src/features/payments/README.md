# payments

Sprint 5.5 — the customer-facing half of the Payments Platform: My Payments and the real, composed-at-read-time Receipt page, reading the real backend (`Coffeshop.Domain.Payments.Payment`) via `lib/payment-client.ts`. The actual checkout charge step (`/checkout/payment`, `PaymentProcessing.tsx`) lives in `features/cart/` — see that feature's own README for why (it's a checkout-flow step, not a Payments-record-viewing one, the same distinction `features/orders/` already draws between order creation and order viewing). Follows the `hero-cup/README.md` template — Architecture, Flow, Responsibilities, Future Extension.

## Architecture

```
payments/
├── components/
│   ├── PaymentHistoryList.tsx   /payments — the customer's own payment history
│   ├── PaymentReceipt.tsx       /payments/[id] — the real receipt, composed at read time
│   └── PaymentStatusBadge.tsx   status→label/variant mapping, shared with features/admin/payments/
└── hooks/
    ├── useMyPaymentsQuery.ts
    └── usePaymentReceiptQuery.ts
```

Routes: `app/payments/(history)/layout.tsx` + `app/payments/(history)/page.tsx` (the `useRequireAuth` guard — `GET /api/v1/payments/history` needs a real account), `app/payments/[id]/layout.tsx` + `app/payments/[id]/page.tsx` (**deliberately no auth guard** — see that layout's own doc comment; a route group, not a plain nested folder, specifically so the history list's guard doesn't cascade onto this sibling route).

## Flow

1. `features/cart/`'s `CheckoutExperience`/`PaymentProcessing` complete a real charge; `OrderConfirmation` links to `/payments/[id]` (the receipt) when a `lastPaymentId` exists.
2. `/payments` (`PaymentHistoryList`) calls `GET /api/v1/payments/history` — every payment the authenticated caller owns, newest first, paginated. A "Receipt" link appears only for a `succeeded` payment.
3. `/payments/[id]` (`PaymentReceipt`) calls `GET /api/v1/payments/{id}/receipt` — a real receipt composed live from `Order`/`Payment` data at read time, never a separately stored/generated document (see `PaymentReceiptDto`'s own doc comment). Reachable with no login at all: `GetPaymentReceiptQuery`'s own ownership-or-staff-or-guest-order check (the same pattern `GetOrderQuery` already established) lets a guest who just paid open their own receipt link, the exact same reasoning `/checkout/confirmation` itself needs no account.

## Responsibilities

- **This feature owns**: the customer-facing payment history/receipt UI, its own query hooks, `PaymentStatusBadge` (shared with `features/admin/payments/`, which imports it directly rather than duplicating the status→label mapping).
- **This feature borrows from `lib/payment-client.ts`**: every network call and the `PaymentDto`/`PaymentSummaryDto`/`PaymentReceiptDto` types — never a second copy of the wire shape.
- **This feature does not own**: starting or confirming a payment (`features/cart/`'s `CheckoutExperience`/`PaymentProcessing`), capture/refund actions (`features/admin/payments/`'s staff-only actions).

## Known simplifications

- No pagination beyond page/pageSize buttons — same reasoning `features/orders/README.md` already gives for its own history list: realistically small for one customer.
- No real-time updates (no SignalR/polling) — a payment's status only changes via a page reload or revisit, same as `features/orders/`.
- No downloadable PDF receipt — the on-demand *page* half of `docs/34_PAYMENTS_NOTIFICATIONS_SEARCH.md`'s own sketch, not the PDF-rendering half; no real caller needs a downloadable file yet, and standing up a rendering pipeline for one nobody asked for would be exactly the speculative infrastructure this project's conventions forbid.

## Future extension

- **Real-time payment status**: same `queryClient.setQueryData` slot `features/orders/README.md` already names for its own future SignalR extension — this feature's query hooks are shaped the same way.
- **A downloadable PDF receipt**: `GetPaymentReceiptQuery`'s composed-live data is already the real source a PDF render would use; adding one is additive, not a rework.
