import { expect, type Page, test } from "@playwright/test";

import { verifyEmailOnly } from "./helpers/admin";
import { skipOnboardingTour } from "./helpers/onboarding";

/**
 * Sprint 5.3 — Ordering Platform. Exercises the real backend (no mocks), same discipline
 * `cart.spec.ts`/`admin.spec.ts` established. Requires the backend API and its docker-compose
 * dev stack running locally.
 *
 * Sprint 5.5 close-out — refactored to share one real registered account across every test that
 * doesn't specifically need a *fresh* one, the same `test.describe.serial` + `beforeAll` pattern
 * `admin-inventory.spec.ts` already established for the identical real problem: `AuthPolicy`'s
 * real 10-requests/minute/IP rate limiter (working as designed) rejecting `POST /auth/register`
 * once a run's total registrations climb too high — confirmed via a live run this close-out
 * produced two real 429s here. Two tests still register their own account deliberately, because
 * sharing would change what they're actually testing: "no orders yet" needs an account that has
 * placed none, and the ownership-isolation test needs a second, genuinely distinct identity.
 */

function uniqueEmail(prefix: string) {
  return `e2e-orders-${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
}

async function registerAndLogin(page: Page, email: string) {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Orders Spec User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Valid1Pass!");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  verifyEmailOnly(email);

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Valid1Pass!");
  await page.getByRole("main").getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("**/");
}

async function loginOnly(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Valid1Pass!");
  await page.getByRole("main").getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("**/");
}

async function addMochaToCart(page: Page) {
  await page.goto("/customize?drink=mocha");
  await page.waitForSelector('[role="application"] canvas');
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await expect(page.getByRole("button", { name: /Cart, \d+ item/ })).toBeVisible();
}

async function placeARealOrder(page: Page, guestName: string, guestEmail: string): Promise<string> {
  await addMochaToCart(page);
  await page.goto("/checkout");
  await page.getByLabel("Name").fill(guestName);
  await page.getByLabel("Email").fill(guestEmail);
  await page.getByRole("button", { name: /Place Order/ }).click();
  await page.waitForURL("**/checkout/confirmation", { timeout: 20_000 });
  const orderNumberText = await page.getByText(/order #/).textContent();
  const orderNumber = orderNumberText?.match(/#(\S+)/)?.[1];
  if (!orderNumber) throw new Error("Confirmation page didn't render a real order number.");
  return orderNumber;
}

test.describe.serial("authenticated customer (one shared account)", () => {
  const sharedCustomerEmail = uniqueEmail("customer");

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await skipOnboardingTour(page);
    await registerAndLogin(page, sharedCustomerEmail);
    await page.close();
    await context.close();
    // Same "real, permanent state; every test logs back in fresh" discipline
    // `admin-inventory.spec.ts`'s own beforeAll already established.
  });

  test("places a real order and sees it in My Orders and Order Details", async ({ page }) => {
    test.setTimeout(90_000);
    await skipOnboardingTour(page);
    await loginOnly(page, sharedCustomerEmail);

    const orderNumber = await placeARealOrder(page, "Ada Lovelace", "ada@example.com");
    await expect(page.getByRole("heading", { name: "Payment confirmed" })).toBeVisible();

    await page.getByRole("button", { name: "View my orders" }).click();
    await page.waitForURL("**/orders");
    await expect(page.getByRole("heading", { name: "My Orders" })).toBeVisible();
    await expect(page.getByText(orderNumber)).toBeVisible();

    await page.locator('a[href^="/orders/"]').first().click();
    await page.waitForURL("**/orders/*");
    await expect(page.getByRole("heading", { name: orderNumber })).toBeVisible();
    await expect(page.getByText("Mocha")).toBeVisible();
    await expect(page.getByText("Order Timeline")).toBeVisible();
    // Regression check for the real Phase 4 bug: timeline must render draft-then-submitted, in
    // that order, never the reverse (a tied-timestamp sort bug — see `OrderTimelineEntry.Sequence`).
    const timelineText = await page.locator("ol").first().textContent();
    expect(timelineText!.indexOf("Draft")).toBeLessThan(timelineText!.indexOf("Submitted"));
  });

  test("cancelling a paid order with a captured payment is blocked by the payment guard, not silently allowed", async ({ page }) => {
    // Sprint 5.5 close-out, Step 3(a) — checkout now real-pays via the Payments Platform before
    // reaching /checkout/confirmation, so by the time this test opens Order Details the order's
    // payment is already captured (Succeeded), not merely reserved. `CancelOrderCommandHandler`
    // deliberately throws `PaymentCapturedException` (409) rather than auto-refunding — a captured
    // charge must be refunded first, then cancelled — see docs/reviews/sprint-5.5-review.md. The
    // frontend has no client-side way to predict this (it doesn't know the payment's own status),
    // so `canCancel` still shows the button for a "paid" order and surfaces the server's real
    // rejection as an alert instead of guessing. This test previously asserted the pre-guard
    // behavior (cancellation succeeding); it now asserts the guard itself.
    test.setTimeout(90_000);
    await skipOnboardingTour(page);
    await loginOnly(page, sharedCustomerEmail);

    await placeARealOrder(page, "Grace Hopper", "grace@example.com");

    await page.goto("/orders");
    await page.locator('a[href^="/orders/"]').first().click();
    await page.waitForURL("**/orders/*");

    await page.getByRole("button", { name: "Cancel order" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "This order has a captured payment and cannot be cancelled directly" }),
    ).toBeVisible();
    await expect(page.getByText("Paid").first()).toBeVisible();
    // The order was never actually cancelled, so the button remains — a real retry surface, not a
    // stuck UI. This is the intended contrast with the old, incorrect "button vanishes" assertion.
    await expect(page.getByRole("button", { name: "Cancel order" })).toHaveCount(1);
  });

  test("cannot view another customer's order — sees the same not-found state as a bad id", async ({ page }) => {
    test.setTimeout(90_000);
    await skipOnboardingTour(page);
    await loginOnly(page, sharedCustomerEmail);

    await placeARealOrder(page, "Owner Customer", "owner@example.com");
    await page.goto("/orders");
    await page.locator('a[href^="/orders/"]').first().click();
    await page.waitForURL("**/orders/*");
    const ownerOrderUrl = page.url();

    // A fresh browser context, not just a fresh page — cookies/in-memory tokens must not leak.
    // This second identity genuinely must be distinct from sharedCustomerEmail, so it still
    // registers its own account rather than reusing the shared one.
    const otherContext = await page.context().browser()!.newContext();
    const otherPage = await otherContext.newPage();
    await skipOnboardingTour(otherPage);
    await registerAndLogin(otherPage, uniqueEmail("other"));
    await otherPage.goto(ownerOrderUrl);
    await expect(otherPage.getByRole("heading", { name: "Order not found" })).toBeVisible();
    await otherContext.close();
  });
});

test("an authenticated customer with no orders sees a real empty state, not a broken page", async ({ page }) => {
  // Deliberately its own fresh account, never the shared one above — this test's whole premise
  // is an account that has placed zero orders.
  await skipOnboardingTour(page);
  await registerAndLogin(page, uniqueEmail("empty"));

  await page.goto("/orders");
  await expect(page.getByRole("heading", { name: "No orders yet" })).toBeVisible();
});

test("an anonymous visitor to /orders is redirected to /login", async ({ page }) => {
  await page.goto("/orders");
  await page.waitForURL("**/login");
});
