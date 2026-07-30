# ADR-0013 — Payment gateway abstraction (`IPaymentProvider`), never bound to one vendor

**Status**: Accepted

## Context

The brief explicitly requires supporting multiple payment gateways (Stripe, Paymob, PayPal named specifically) without binding business logic to any one of them. Payment gateways differ significantly in their SDK shapes, webhook formats, and idempotency mechanisms — a naive integration would either scatter one gateway's SDK types through `Order`/`PlaceOrderCommand` handling code (making a second gateway a rewrite, not an addition) or force a lowest-common-denominator feature set that loses each gateway's real capabilities.

## Decision

A single `IPaymentProvider` interface (`CreateIntentAsync`/`CaptureAsync`/`RefundAsync`, [34_PAYMENTS_NOTIFICATIONS_SEARCH.md](../34_PAYMENTS_NOTIFICATIONS_SEARCH.md)) that every domain and application-layer consumer depends on exclusively — no gateway SDK type ever appears outside the one concrete class implementing this interface for that gateway. `Idempotency-Key` is threaded from the frontend's request through to the provider call uniformly, with providers lacking native idempotency support getting it emulated at the adapter level rather than the interface's shape changing per provider.

## Consequences

Gains: a second gateway (Paymob, PayPal) is a new class implementing an existing interface plus a DI registration — never a change to `Order`, `Payment`, or any command handler; the interface can be reviewed for vendor leakage before a second real implementation exists, catching a coupling mistake at design time rather than at "add gateway #2" time (a check explicitly scheduled as C-03 in [38_COMMERCE_RISK_REGISTER.md](../38_COMMERCE_RISK_REGISTER.md)). Costs, named honestly: the interface is necessarily a narrower surface than any single gateway's full feature set — a gateway-specific capability with no equivalent elsewhere (e.g. a specific regional payment method) either doesn't fit the abstraction cleanly or needs a deliberate, reviewed extension, not a silent one-off special case.
