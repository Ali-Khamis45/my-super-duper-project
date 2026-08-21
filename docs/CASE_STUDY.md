# Case Study: Real Bugs, Real Fixes

This project runs on an adversarial-review discipline: every sprint ends with a real review pass — architecture, security, performance — and real bugs found during that pass get written up, not glossed over. This doc pulls three of the more instructive ones out of `docs/reviews/` and tells them properly, plus an honest accounting of what's still deliberately unfinished. Every fact below is sourced from the actual review docs and `explain.md`, not reconstructed from memory — see the citation on each.

---

## War story 1: A logout could kill every *other* session too

**Source:** [`docs/reviews/sprint-5.1-review.md`](reviews/sprint-5.1-review.md), Security review.

**The bug.** Refresh-token rotation has a well-known theft-detection pattern: if a *revoked* refresh token is ever presented again, that's a strong signal it was stolen and used after the legitimate owner already rotated past it — so the standard response is to revoke every session for that account, forcing a full re-login everywhere. This project's own frozen architecture doc specified exactly that: "a revoked token presented again triggers revoke-all."

The bug was in what counts as "revoked." A token gets marked revoked for several reasons — rotation (the theft scenario), an explicit `/revoke-session` call, or a plain logout. The original implementation didn't distinguish between them. So: log in on two devices, explicitly revoke session A's own token via the legitimate "log out this device" endpoint, then have device A's browser present its now-stale cookie again (a completely ordinary thing to happen — a tab that hasn't refreshed yet) — and the system read that as theft, and nuked device B's session too. A user logging out of one browser tab could silently get logged out of their phone.

**How it was found.** Not by a test — by hand. The review explicitly credits manual testing: "manually testing `/revoke-session` followed immediately by `/refresh` with that same session's now-revoked cookie triggered reuse-detection's full revoke-all response." This is the kind of bug a narrowly-scoped unit test won't surface, because the unit test would naturally test *rotation*-revocation (the case the spec describes), not *logout*-revocation (the case nobody thought to write down as different).

**Why it mattered.** This is a real, shippable-looking security feature that was subtly, silently wrong in a way that degrades trust rather than security — the fix isn't "make it more secure," it's "stop it from being a false positive that punishes normal behavior." A security feature that cries wolf on ordinary logout traffic is one users learn to route around, which is its own kind of security failure.

**The fix.** Narrow the trigger to the *actual* theft signal: only a token revoked *by rotation specifically* (tracked via a `ReplacedByTokenId` field, set only when rotation is what revoked it) triggers revoke-all. A token revoked by logout, explicit session revocation, or a password reset, presented again, is just a stale cookie — an ordinary 401, nothing more.

**Verification.** Two unit tests locking in each branch (`RotateRefreshToken_TokenAlreadyRotatedAway_ThrowsReuseDetectedAndRevokesEverySession`, `RotateRefreshToken_TokenRevokedByLogoutNotRotation_ThrowsInvalidTokenWithoutRevokingOtherSessions`), plus — because this is exactly the class of bug a mock can hide — a live integration test exercising the real HTTP flow end to end: register, verify, log in on two simulated devices, rotate device A, replay device A's stale cookie, confirm reuse-detection *does* fire and device B *does* die (proving the real theft case still works), then separately confirm a logout-revoked replay does *not* cascade.

---

## War story 2: The same class of bug, recurring three sprints later — and the fix said so

**Source:** [`docs/reviews/sprint-5.1-review.md`](reviews/sprint-5.1-review.md) and [`docs/reviews/sprint-5.5-review.md`](reviews/sprint-5.5-review.md), both Security review sections.

**The first appearance (Sprint 5.1).** The CQRS pipeline's `UnitOfWorkBehavior` originally saved changes to the database only *after* a command handler returned successfully. That's the common case, but it quietly broke a legitimate pattern: a handler that mutates state and *then* throws a business exception — exactly what reuse-detection's own revoke-all does (mutate every session to revoked, then throw so the caller gets a 401). The mutation happened in memory. The throw happened. The save never did. War story 1's fix was, in the database, a complete no-op — correct in memory, silently ineffective on disk. Fixed with a `try`/`catch` around the save so it runs on both the happy path and the throw path.

**The second appearance (Sprint 5.5, four sprints later).** The same behavior's *own follow-up fix* had a second, more subtle problem: the recovery-save on the throw path reused the original request's own `CancellationToken` — the same token that gets cancelled the instant an HTTP client disconnects. A customer's browser closing right as `ConfirmPaymentCommand` finished capturing a real payment (mutating `Payment`/`Order` in memory, transaction not yet committed) would cancel that token; the recovery save would then throw immediately on `OperationCanceledException`, and a payment that had genuinely, successfully gone through would silently vanish from the database. The money moved. The receipt didn't exist.

This is what makes it a genuinely good story rather than just a bug list entry: the Sprint 5.5 review doesn't just fix this instance, it names the connection back to Sprint 5.1 explicitly — "this also retroactively hardens the original Sprint 5.1 scenario." The fix (`CancellationToken.None` for a recovery save specifically, since its entire purpose is to persist a mutation that already happened, independent of whether anyone is still listening) closes both the original 2021-shaped bug and this new payment-shaped one with the same one-line change.

**Verification.** Six new regression tests (`UnitOfWorkBehaviorTests.cs`), including one that asserts the recovery save is called with a token where `IsCancellationRequested` is false, specifically simulating the disconnect-mid-request scenario.

---

## War story 3: A refund that could reach Stripe before the number was checked

**Source:** [`docs/reviews/sprint-5.5-review.md`](reviews/sprint-5.5-review.md), Security review.

**The bug.** `RefundPaymentCommandHandler` had two real guards: a status check (can't refund a payment that isn't `Succeeded`/`PartiallyRefunded`) and an amount check (can't refund more than what's actually left refundable). Both guards existed — inside `Payment.Refund`'s own domain method. The handler called the real payment gateway's `RefundAsync` *first*, then called `Payment.Refund` (which is where both checks actually lived) *after*. An over-refund request, or a request against a payment in the wrong state, would reach Stripe and trigger a real gateway-side refund *before* either check ever ran.

**Why it mattered.** This is the exact "money moves before validation" shape two other findings in the same sprint (`PayOrderCommand`'s double-charge guard, `CancelOrderCommand`'s captured-payment guard) were built specifically to prevent — this was the same category of bug hiding in the fourth money-touching command handler nobody had looked at yet with that specific question in mind.

**The fix.** Move both checks in front of the gateway call: `payment.Status is not (Succeeded or PartiallyRefunded)` throws first, then the amount-bounds check throws, and only after both pass does `paymentGateway.RefundAsync` get reached at all.

**Verification.** Two new regression tests, and the assertion in each is the actual point of the fix, not just the outcome: `await _paymentGateway.DidNotReceive().RefundAsync(...)` — proving the gateway is never even called in either invalid case, not just that the local state ends up correct.

---

## What's deliberately unfinished, and why

Named plainly, the same way this project's own sprint reviews always have — not hidden, not softened. Full detail and the complete current list: [`explain.md`](../explain.md).

- **`CancelPaymentCommand` has no gateway-level cancel/void call.** `IPaymentGateway` has no cancel/void method at all yet — cancelling a payment only ever changes local state. Mitigated (a captured/already-succeeded payment can't be silently cancelled; a late webhook success arriving after a local cancellation is logged as an error for manual reconciliation, not silently swallowed) but genuinely not fixed. This is the single highest-priority real gap in the project as it stands — see [`docs/reviews/sprint-5.5-review.md`](reviews/sprint-5.5-review.md) and [`docs/36_SECURITY_MODEL.md`](36_SECURITY_MODEL.md) for the full disclosure.
- **Redis has been provisioned since the very first commerce sprint and is not consumed by a single line of real backend code.** Confirmed by a direct source grep, not an assumption — zero `IDistributedCache`/`StackExchange.Redis` usage anywhere. It sits in `docker-compose.yml` for a caching/rate-limiting/SignalR-backplane future that hasn't arrived yet.
- **A full GLB/KTX2 3D-asset import pipeline was built and tested in Milestone 2 and has never been used.** The cup and every part of it remain fully procedural geometry through every sprint since. Either commit to sourcing real assets someday or retire the pipeline — right now it's tested dead weight.
- **The frozen DDD model's own stated rule** — no command handler touches two aggregate roots from two different bounded contexts in one transaction — **is knowingly violated by design** in the Inventory↔Ordering and Payments↔Ordering integration points, because eventual consistency can't answer "is this order actually paid/in stock" fast enough for a checkout flow. Reasoned and disclosed in the relevant sprint reviews each time, but it's a real, permanent deviation from a document literally named "frozen," worth knowing before extending either area.
- **No GDPR/CCPA data export/deletion flow exists.** Named as an accepted gap from the very first sprint, not something that crept in unnoticed.
