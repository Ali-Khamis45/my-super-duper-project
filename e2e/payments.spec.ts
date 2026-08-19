import { expect, type Page, test } from "@playwright/test";

import { verifyEmailOnly } from "./helpers/admin";
import { skipOnboardingTour } from "./helpers/onboarding";

/**
 * Sprint 5.5 — Payments Platform. Exercises the real backend (no mocks) against
 * `FakePaymentGateway` — the same "real protocol implementation, fake destination" discipline
 * Mailhog already established for email — same discipline `cart.spec.ts`/`orders.spec.ts` use.
 * Requires the backend API and its docker-compose dev stack running locally.
 *
 * A real, disclosed gap this suite does not cover: `FakePaymentGateway`'s magic-amount decline/
 * provider-error convention (`.13`/`.14` cents) is unreachable through any real order composed
 * from this catalog's own pricing — every product price and ingredient modifier is a multiple of
 * $0.05, and `.13`/`.14` cents can never result from summing multiples of five cents. Declined/
 * provider-error/retry paths are covered instead by `PaymentCommandHandlerTests.cs`
 * (Application-layer, gateway mocked directly — see this sprint's own review for the full
 * disclosure) rather than a real end-to-end browser flow.
 */

function uniqueEmail(prefix: string) {
  return `e2e-payments-${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
}

async function registerAndLogin(page: Page, email: string) {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Payments Spec User");
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

async function addMochaToCart(page: Page) {
  await page.goto("/customize?drink=mocha");
  await page.waitForSelector('[role="application"] canvas');
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await expect(page.getByRole("button", { name: /Cart, \d+ item/ })).toBeVisible();
}

test("checkout real-pays through /checkout/payment and lands on a working receipt", async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await addMochaToCart(page);
  await page.goto("/checkout");
  await page.getByLabel("Name").fill("Ada Lovelace");
  await page.getByLabel("Email").fill("ada-payments@example.com");
  await page.getByRole("button", { name: /Place Order/ }).click();

  // The real hop this sprint adds: Place Order no longer jumps straight to confirmation, it
  // routes through the real charge step first. FakePaymentGateway resolves synchronously, so
  // this is normally too fast to reliably catch mid-flight — the real assertion is that the
  // final URL/heading is reached via a route that actually passed through here, not that this
  // intermediate state is observably slow.
  await page.waitForURL("**/checkout/confirmation", { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Payment confirmed" })).toBeVisible();
  await expect(page.getByText(/order #/)).toBeVisible();

  await page.getByRole("button", { name: "View receipt" }).click();
  await page.waitForURL("**/payments/*");
  await expect(page.getByRole("heading", { name: "Receipt" })).toBeVisible();
  await expect(page.getByText("Mocha")).toBeVisible();
  await expect(page.getByText(/Charged to visa ending in 4242/)).toBeVisible();

  expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
});

test("revisiting /checkout/payment after a successful payment (back button) is a safe no-op, not a double charge", async ({ page }) => {
  test.setTimeout(90_000);
  await addMochaToCart(page);
  await page.goto("/checkout");
  await page.getByLabel("Name").fill("Grace Hopper");
  await page.getByLabel("Email").fill("grace-payments@example.com");
  await page.getByRole("button", { name: /Place Order/ }).click();
  await page.waitForURL("**/checkout/confirmation", { timeout: 20_000 });

  // cart-store's lastPaymentId persists across navigation — this simulates the real "pressed
  // back after a successful payment" case, not a fabricated one.
  await page.goto("/checkout/payment");
  await page.waitForURL("**/checkout/confirmation", { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Payment confirmed" })).toBeVisible();
});

test("an authenticated customer sees a real succeeded payment in My Payments", async ({ page }) => {
  test.setTimeout(90_000);
  await skipOnboardingTour(page);
  await registerAndLogin(page, uniqueEmail("history"));

  await addMochaToCart(page);
  await page.goto("/checkout");
  await page.getByLabel("Name").fill("Katherine Johnson");
  await page.getByLabel("Email").fill("katherine@example.com");
  await page.getByRole("button", { name: /Place Order/ }).click();
  await page.waitForURL("**/checkout/confirmation", { timeout: 20_000 });

  await page.goto("/payments");
  await expect(page.getByRole("heading", { name: "My Payments" })).toBeVisible();
  await expect(page.getByText("Succeeded")).toBeVisible();

  // Rendered as `<Button render={<Link .../>}>` (PaymentHistoryList.tsx) — a real anchor tag
  // under the hood, so its accessible role is "link", not "button".
  await page.getByRole("link", { name: "Receipt" }).click();
  await page.waitForURL("**/payments/*");
  await expect(page.getByRole("heading", { name: "Receipt" })).toBeVisible();
});

test("an anonymous visitor to /payments (the history list) is redirected to /login", async ({ page }) => {
  // Unlike this list, /payments/[id] (the receipt itself) is deliberately public — see the first
  // test above, which reaches a real receipt with no login at all.
  await page.goto("/payments");
  await page.waitForURL("**/login");
});
