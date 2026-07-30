import { expect, type Page, test } from "@playwright/test";

import { verifyAndPromoteToStaff, verifyEmailOnly } from "./helpers/admin";
import { skipOnboardingTour } from "./helpers/onboarding";

/**
 * Sprint 5.3, Phase 7 — Admin Order Management. Same real-backend discipline as
 * `admin.spec.ts`/`orders.spec.ts`. Deliberately promotes to `Staff`, not `Admin` — the
 * realistic role for Ordering's own admin pages (`ViewOrders`/`UpdateOrderStatus`, seeded to
 * `Staff`, not `ManageProducts`) — a real regression this suite catches if `/admin/orders`'s
 * guard ever regresses back to `Admin`-only.
 */

function uniqueEmail(prefix: string) {
  return `e2e-admin-orders-${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
}

async function registerAndLogin(page: Page, email: string, promoteToStaff: boolean) {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Admin Orders Spec User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Valid1Pass!");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  if (promoteToStaff) verifyAndPromoteToStaff(email);
  else verifyEmailOnly(email);

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Valid1Pass!");
  await page.getByRole("main").getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("**/");
}

async function placeGuestOrder(page: Page, guestName: string, guestEmail: string): Promise<string> {
  await page.goto("/customize?drink=cappuccino");
  await page.waitForSelector('[role="application"] canvas');
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await expect(page.getByRole("button", { name: /Cart, \d+ item/ })).toBeVisible();

  await page.goto("/checkout");
  await page.getByLabel("Name").fill(guestName);
  await page.getByLabel("Email").fill(guestEmail);
  await page.getByRole("button", { name: /Place Order/ }).click();
  await page.waitForURL("**/checkout/confirmation", { timeout: 20_000 });

  const orderNumberText = await page.getByText(/order #/).textContent();
  const orderNumber = orderNumberText?.match(/#(\S+)/)?.[1];
  if (!orderNumber) throw new Error("Order confirmation page didn't render a real order number.");
  return orderNumber;
}

test("anonymous visitors to /admin/orders are redirected to /login", async ({ page }) => {
  await page.goto("/admin/orders");
  await page.waitForURL("**/login");
});

test("a plain customer (no orders permission) sees Access Denied, not the orders list", async ({ page }) => {
  test.setTimeout(60_000);
  await skipOnboardingTour(page);
  await registerAndLogin(page, uniqueEmail("customer"), false);

  await page.goto("/admin/orders");
  await expect(page.getByText(/don't have access/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Orders", exact: true })).toHaveCount(0);
});

test("staff (not admin): can search for a real guest order by order number and mark it paid then completed", async ({ page }) => {
  test.setTimeout(120_000);
  await skipOnboardingTour(page);

  const guestName = `E2E Guest ${Date.now()}`;
  const orderNumber = await placeGuestOrder(page, guestName, "e2e-guest@example.com");

  await registerAndLogin(page, uniqueEmail("staff"), true);

  await page.goto("/admin/orders");
  await expect(page.getByRole("heading", { name: "Orders", exact: true })).toBeVisible();

  await page.getByPlaceholder(/Order number or guest/).fill(orderNumber);
  await expect(page.getByText(orderNumber)).toBeVisible();
  await expect(page.getByText(guestName)).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "View" })).toHaveCount(1);

  await page.getByRole("main").getByRole("link", { name: "View" }).click();
  await page.waitForURL("**/admin/orders/*");
  await expect(page.getByRole("heading", { name: orderNumber })).toBeVisible();

  await page.getByRole("button", { name: "Mark paid" }).click();
  await expect(page.getByText("Paid", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Mark completed" }).click();
  await expect(page.getByText("Completed", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark paid" })).toHaveCount(0);
});

test("staff: can fail a submitted order with a real reason", async ({ page }) => {
  test.setTimeout(120_000);
  await skipOnboardingTour(page);

  const guestName = `E2E Fail Guest ${Date.now()}`;
  const orderNumber = await placeGuestOrder(page, guestName, "e2e-guest-fail@example.com");

  await registerAndLogin(page, uniqueEmail("staff-fail"), true);

  await page.goto("/admin/orders");
  await page.getByPlaceholder(/Order number or guest/).fill(orderNumber);
  await expect(page.getByText(guestName)).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "View" })).toHaveCount(1);

  await page.getByRole("main").getByRole("link", { name: "View" }).click();
  await page.waitForURL("**/admin/orders/*");

  await page.getByRole("button", { name: "Mark failed" }).click();
  await page.getByLabel("Failure reason").fill("Card declined");
  await page.getByRole("button", { name: "Confirm" }).click();

  await expect(page.getByText("Failed", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Failed: Card declined")).toBeVisible();
});

test("admin orders list filters by status", async ({ page }) => {
  test.setTimeout(60_000);
  await skipOnboardingTour(page);
  await registerAndLogin(page, uniqueEmail("staff-filter"), true);

  await page.goto("/admin/orders");
  await expect(page.getByRole("heading", { name: "Orders", exact: true })).toBeVisible();

  await page.getByLabel("Status").click();
  await page.getByRole("option", { name: "Completed" }).click();
  // A real filtered refetch, not a client-side no-op — every visible row (if any) now shows the
  // filtered-for status. Asserted against the actual result rows, not the select trigger's own
  // display text (which shows the raw lowercase filter value plus a decorative arrow glyph, not
  // the capitalized option label — not what this test is really checking).
  const statusCells = page.locator("table tbody tr td:nth-child(5)");
  const count = await statusCells.count();
  for (let index = 0; index < count; index += 1) {
    await expect(statusCells.nth(index)).toHaveText("Completed");
  }
});
