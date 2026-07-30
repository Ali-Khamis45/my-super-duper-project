import { expect, type Page, test } from "@playwright/test";

import { verifyEmailOnly } from "./helpers/admin";
import { skipOnboardingTour } from "./helpers/onboarding";

/**
 * Sprint 5.3 — Ordering Platform. Exercises the real backend (no mocks), same discipline
 * `cart.spec.ts`/`admin.spec.ts` established. Requires the backend API and its docker-compose
 * dev stack running locally.
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

async function addMochaToCart(page: Page) {
  await page.goto("/customize?drink=mocha");
  await page.waitForSelector('[role="application"] canvas');
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await expect(page.getByRole("button", { name: /Cart, \d+ item/ })).toBeVisible();
}

test("an authenticated customer places a real order and sees it in My Orders and Order Details", async ({ page }) => {
  test.setTimeout(90_000);
  await skipOnboardingTour(page);
  await registerAndLogin(page, uniqueEmail("customer"));

  await addMochaToCart(page);
  await page.goto("/checkout");
  await page.getByLabel("Name").fill("Ada Lovelace");
  await page.getByLabel("Email").fill("ada@example.com");
  await page.getByRole("button", { name: /Place Order/ }).click();
  await page.waitForURL("**/checkout/confirmation", { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Order confirmed" })).toBeVisible();
  const orderNumberText = await page.getByText(/order #/).textContent();
  const orderNumber = orderNumberText?.match(/#(\S+)/)?.[1];
  expect(orderNumber).toBeTruthy();

  await page.getByRole("button", { name: "View my orders" }).click();
  await page.waitForURL("**/orders");
  await expect(page.getByRole("heading", { name: "My Orders" })).toBeVisible();
  await expect(page.getByText(orderNumber!)).toBeVisible();

  await page.locator('a[href^="/orders/"]').first().click();
  await page.waitForURL("**/orders/*");
  await expect(page.getByRole("heading", { name: orderNumber! })).toBeVisible();
  await expect(page.getByText("Mocha")).toBeVisible();
  await expect(page.getByText("Order Timeline")).toBeVisible();
  // Regression check for the real Phase 4 bug: timeline must render draft-then-submitted, in
  // that order, never the reverse (a tied-timestamp sort bug — see `OrderTimelineEntry.Sequence`).
  const timelineText = await page.locator("ol").first().textContent();
  expect(timelineText!.indexOf("Draft")).toBeLessThan(timelineText!.indexOf("Submitted"));
});

test("a customer can cancel their own submitted order from Order Details", async ({ page }) => {
  test.setTimeout(90_000);
  await skipOnboardingTour(page);
  await registerAndLogin(page, uniqueEmail("cancel"));

  await addMochaToCart(page);
  await page.goto("/checkout");
  await page.getByLabel("Name").fill("Grace Hopper");
  await page.getByLabel("Email").fill("grace@example.com");
  await page.getByRole("button", { name: /Place Order/ }).click();
  await page.waitForURL("**/checkout/confirmation", { timeout: 20_000 });

  await page.goto("/orders");
  await page.locator('a[href^="/orders/"]').first().click();
  await page.waitForURL("**/orders/*");

  await page.getByRole("button", { name: "Cancel order" }).click();
  await expect(page.getByText("Cancelled").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel order" })).toHaveCount(0);
});

test("an authenticated customer with no orders sees a real empty state, not a broken page", async ({ page }) => {
  await skipOnboardingTour(page);
  await registerAndLogin(page, uniqueEmail("empty"));

  await page.goto("/orders");
  await expect(page.getByRole("heading", { name: "No orders yet" })).toBeVisible();
});

test("an anonymous visitor to /orders is redirected to /login", async ({ page }) => {
  await page.goto("/orders");
  await page.waitForURL("**/login");
});

test("a customer cannot view another customer's order — sees the same not-found state as a bad id", async ({ page }) => {
  test.setTimeout(90_000);
  await skipOnboardingTour(page);
  await registerAndLogin(page, uniqueEmail("owner"));

  await addMochaToCart(page);
  await page.goto("/checkout");
  await page.getByLabel("Name").fill("Owner Customer");
  await page.getByLabel("Email").fill("owner@example.com");
  await page.getByRole("button", { name: /Place Order/ }).click();
  await page.waitForURL("**/checkout/confirmation", { timeout: 20_000 });

  await page.goto("/orders");
  await page.locator('a[href^="/orders/"]').first().click();
  await page.waitForURL("**/orders/*");
  const ownerOrderUrl = page.url();

  // A fresh browser context, not just a fresh page — cookies/in-memory tokens must not leak.
  const otherContext = await page.context().browser()!.newContext();
  const otherPage = await otherContext.newPage();
  await skipOnboardingTour(otherPage);
  await registerAndLogin(otherPage, uniqueEmail("other"));
  await otherPage.goto(ownerOrderUrl);
  await expect(otherPage.getByRole("heading", { name: "Order not found" })).toBeVisible();
  await otherContext.close();
});
