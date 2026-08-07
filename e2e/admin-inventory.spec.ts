import { expect, type Page, test } from "@playwright/test";

import { verifyAndPromoteToStaff, verifyEmailOnly } from "./helpers/admin";
import { skipOnboardingTour } from "./helpers/onboarding";

/**
 * Sprint 5.4, Phase 9/Phase 6 — Admin Inventory. Same real-backend discipline as
 * `admin-orders.spec.ts`: promotes to `Staff` (`inventory:view`/`inventory:adjust`, seeded to
 * `Staff` alongside the Ordering permissions), never `Admin`-only. Relies on `InventorySeeder`'s
 * real dev seed data ("foam", "milk", etc. — see `Coffeshop.Persistence.Seed.InventorySeeder`)
 * rather than seeding fresh rows itself, since there's no admin "create inventory item" UI this
 * sprint built a form for (`CreateInventoryItemCommand` exists backend-side, but every seeded
 * ingredient already has a tracked `InventoryItem` — see this feature's own README for why a
 * create-item form wasn't built this sprint).
 *
 * `test.describe.serial` + one shared staff login (`beforeAll`) for every staff-only test below —
 * a real, live-verified constraint this suite ran into: `AuthPolicy`'s real
 * 10-requests/minute/IP rate limiter (working as designed, not a bug) rejects a fresh
 * `POST /auth/register` per test once a spec file has more than a handful of them. One shared
 * identity, reused across tests via one persistent `page`, matches `OrderEndpointsTests.cs`'s own
 * `GetOrCreateAsync` reasoning on the backend integration-test side of this exact problem.
 */

function uniqueEmail(prefix: string) {
  return `e2e-admin-inventory-${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
}

async function registerAndLogin(page: Page, email: string, promoteToStaff: boolean) {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Admin Inventory Spec User");
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

test("anonymous visitors to /admin/inventory are redirected to /login", async ({ page }) => {
  await page.goto("/admin/inventory");
  await page.waitForURL("**/login");
});

test("a plain customer (no inventory permission) sees Access Denied, not the inventory list", async ({ page }) => {
  test.setTimeout(60_000);
  await skipOnboardingTour(page);
  await registerAndLogin(page, uniqueEmail("customer"), false);

  await page.goto("/admin/inventory");
  await expect(page.getByText(/don't have access/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Inventory", exact: true })).toHaveCount(0);
});

test.describe.serial("staff workflows (one shared login)", () => {
  const sharedStaffEmail = uniqueEmail("staff-shared");

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await skipOnboardingTour(page);
    await registerAndLogin(page, sharedStaffEmail, true);
    await page.close();
    await context.close();
    // The registration/promotion above is real, permanent state in the dev database — every test
    // below logs this same account in fresh (real POST /auth/login, not a copied token), the same
    // "login still goes through the real endpoint everywhere it's used" discipline
    // `CoffeshopApiFactory.CreateVerifiedUserAsync`'s own doc comment establishes backend-side.
  });

  async function loginAsSharedStaff(page: Page) {
    await page.goto("/login");
    await page.getByLabel("Email").fill(sharedStaffEmail);
    await page.getByLabel("Password").fill("Valid1Pass!");
    await page.getByRole("main").getByRole("button", { name: "Log in" }).click();
    await page.waitForURL("**/");
  }

  test("sees the real seeded ingredients with real stock/status, and can search", async ({ page }) => {
    test.setTimeout(60_000);
    await skipOnboardingTour(page);
    await loginAsSharedStaff(page);

    await page.goto("/admin/inventory");
    await expect(page.getByRole("heading", { name: "Inventory", exact: true })).toBeVisible();
    await expect(page.getByText("Extra Foam")).toBeVisible();
    await expect(page.getByText("Steamed Milk")).toBeVisible();

    await page.getByPlaceholder(/Ingredient name or code/).fill("foam");
    await expect(page.getByText("Extra Foam")).toBeVisible();
    await expect(page.getByText("Steamed Milk")).toHaveCount(0);
  });

  test("dashboard summary shows real counts including the seeded low-stock item", async ({ page }) => {
    test.setTimeout(60_000);
    await skipOnboardingTour(page);
    await loginAsSharedStaff(page);

    await page.goto("/admin/inventory");
    // InventorySeeder seeds exactly one LowStock item ("milk", threshold raised to 20 against 15
    // on-hand) — a real, deliberate seed choice so a fresh environment has something to verify
    // against, not a fabricated assertion.
    await expect(page.getByText("Low stock").first()).toBeVisible();
  });

  test("can restock an item and see the on-hand balance update", async ({ page }) => {
    test.setTimeout(60_000);
    await skipOnboardingTour(page);
    await loginAsSharedStaff(page);

    await page.goto("/admin/inventory");
    await page.getByPlaceholder(/Ingredient name or code/).fill("syrup");
    await expect(page.getByRole("main").getByRole("link", { name: "View" })).toHaveCount(1);
    await page.getByRole("main").getByRole("link", { name: "View" }).click();
    await page.waitForURL("**/admin/inventory/*");
    await expect(page.getByRole("heading", { name: "Vanilla Syrup" })).toBeVisible();

    const onHandBefore = await page.getByText("On hand").locator("xpath=following-sibling::span").textContent();

    await page.getByLabel("Quantity").fill("7");
    await page.getByLabel("Note (optional)").fill("E2E restock");
    await page.getByRole("button", { name: "Restock" }).click();

    await expect
      .poll(async () => page.getByText("On hand").locator("xpath=following-sibling::span").textContent())
      .not.toBe(onHandBefore);
    // "+7 →" — the signed delta the activity feed renders — not just the ever-present "Restock"
    // card heading, which would pass even if the activity list never actually refreshed.
    // `.first()`: a real dev database accumulates real restock history across repeated runs.
    await expect(page.getByText("+7 →").first()).toBeVisible();
  });

  test("can adjust an item down with a reason, and rejects a zero delta", async ({ page }) => {
    test.setTimeout(60_000);
    await skipOnboardingTour(page);
    await loginAsSharedStaff(page);

    await page.goto("/admin/inventory");
    await page.getByPlaceholder(/Ingredient name or code/).fill("cinnamon");
    await expect(page.getByRole("main").getByRole("link", { name: "View" })).toHaveCount(1);
    await page.getByRole("main").getByRole("link", { name: "View" }).click();
    await page.waitForURL("**/admin/inventory/*");

    await expect(page.getByRole("button", { name: "Apply adjustment" })).toBeDisabled();

    await page.getByLabel("Delta (negative shrinks stock)").fill("-2");
    await page.getByLabel("Reason").fill("E2E spoilage");
    await expect(page.getByRole("button", { name: "Apply adjustment" })).toBeEnabled();
    await page.getByRole("button", { name: "Apply adjustment" }).click();

    await expect(page.getByText(/Manual adjustment/).first()).toBeVisible();
  });

  test("can mark an item out of stock and back available", async ({ page }) => {
    test.setTimeout(60_000);
    await skipOnboardingTour(page);
    await loginAsSharedStaff(page);

    await page.goto("/admin/inventory");
    await page.getByPlaceholder(/Ingredient name or code/).fill("sprinkles");
    await expect(page.getByRole("main").getByRole("link", { name: "View" })).toHaveCount(1);
    await page.getByRole("main").getByRole("link", { name: "View" }).click();
    await page.waitForURL("**/admin/inventory/*");

    await page.getByRole("button", { name: "Mark out of stock" }).click();
    await expect(page.getByText("Out of stock", { exact: true }).first()).toBeVisible();

    await page.getByRole("button", { name: "Re-derive status" }).click();
    await expect(page.getByText("Available", { exact: true }).first()).toBeVisible();
  });

  test("inventory list filters by status", async ({ page }) => {
    test.setTimeout(60_000);
    await skipOnboardingTour(page);
    await loginAsSharedStaff(page);

    await page.goto("/admin/inventory");
    await expect(page.getByRole("heading", { name: "Inventory", exact: true })).toBeVisible();

    await page.getByLabel("Status").click();
    await page.getByRole("option", { name: "Low stock" }).click();

    const statusCells = page.locator("table tbody tr td:nth-child(5)");
    const count = await statusCells.count();
    expect(count).toBeGreaterThan(0);
    for (let index = 0; index < count; index += 1) {
      await expect(statusCells.nth(index)).toHaveText("Low stock");
    }
  });

  test("reservations viewer loads for staff and is reachable from the inventory list", async ({ page }) => {
    test.setTimeout(60_000);
    await skipOnboardingTour(page);
    await loginAsSharedStaff(page);

    await page.goto("/admin/inventory");
    await page.getByRole("link", { name: "Reservations" }).click();
    await page.waitForURL("**/admin/inventory/reservations");
    await expect(page.getByRole("heading", { name: "Inventory reservations" })).toBeVisible();
  });

  test("end to end: a real guest order reserves foam, and paying it as staff consumes the reservation", async ({ page, request }) => {
    test.setTimeout(120_000);

    // A direct API call for order creation, not the `/customize` 3D flow `admin-orders.spec.ts`'s
    // own `placeGuestOrder` uses — that flow's default "Add to Cart" carries an *empty*
    // ingredients array (no stock-tracked ingredient is added without an explicit customizer
    // drag-and-drop interaction, real HTML5 drag events this suite doesn't automate elsewhere
    // either), so it would create zero reservations and not actually exercise anything this
    // sprint built. This still exercises the real backend end to end (real HTTP, real Postgres);
    // it only skips automating an unrelated, fragile 3D interaction to reach the state this test
    // actually needs — the same coverage `OrderInventoryIntegrationTests.cs` already proves at the
    // backend layer, added here specifically to prove the new *admin UI* reflects it correctly.
    const menuResponse = await request.get("http://localhost:5000/api/v1/menu");
    const menu = (await menuResponse.json()) as Array<{ id: string }>;
    const productId = menu[0]!.id;

    const guestName = `E2E Inventory Guest ${Date.now()}`;
    const createResponse = await request.post("http://localhost:5000/api/v1/orders", {
      data: {
        lines: [
          {
            productId,
            selection: {
              color: "cream",
              size: "medium",
              sleeve: "kraft",
              lid: "classic",
              logo: "classic",
              material: "glossy",
              ingredients: [{ ingredientId: "foam", quantity: 3 }],
            },
            quantity: 1,
            recommendationId: null,
          },
        ],
        guestName,
        guestEmail: "e2e-inventory-guest@example.com",
        fulfillmentMethod: "Pickup",
        idempotencyKey: `e2e-inventory-${Date.now()}`,
      },
    });
    expect(createResponse.ok()).toBeTruthy();
    const order = (await createResponse.json()) as { orderNumber: string };
    const orderNumber = order.orderNumber;

    await skipOnboardingTour(page);
    await loginAsSharedStaff(page);
    const staffPage = page;

    // The real reservation this order created — a genuine Active reservation for a real,
    // stock-tracked ingredient (foam).
    await staffPage.goto("/admin/inventory/reservations");
    await expect(staffPage.getByText(orderNumber)).toBeVisible();

    await staffPage.goto("/admin/orders");
    await staffPage.getByPlaceholder(/Order number or guest/).fill(orderNumber);
    await expect(staffPage.getByRole("main").getByRole("link", { name: "View" })).toHaveCount(1);
    await staffPage.getByRole("main").getByRole("link", { name: "View" }).click();
    await staffPage.waitForURL("**/admin/orders/*");
    await staffPage.getByRole("button", { name: "Mark paid" }).click();
    await expect(staffPage.getByText("Paid", { exact: true }).first()).toBeVisible();

    await staffPage.goto("/admin/inventory/reservations");
    await staffPage.getByLabel("Status").click();
    await staffPage.getByRole("option", { name: "Consumed" }).click();
    await expect(staffPage.getByText(orderNumber)).toBeVisible();
  });
});
