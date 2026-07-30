import { expect, type Page, test } from "@playwright/test";

import { verifyAndPromoteToAdmin, verifyEmailOnly } from "./helpers/admin";
import { skipOnboardingTour } from "./helpers/onboarding";

/**
 * Sprint 5.2, Phase 7 — Admin Product Management. Exercises the real backend (no mocks), same
 * discipline `auth.spec.ts` established. Requires the backend API and its docker-compose dev
 * stack running locally, same as every other spec in this suite that logs in.
 */

function uniqueEmail(prefix: string) {
  return `e2e-admin-${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
}

async function registerAndLogin(page: Page, email: string, promote: boolean) {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Admin Spec User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Valid1Pass!");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  if (promote) verifyAndPromoteToAdmin(email);
  else verifyEmailOnly(email);

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Valid1Pass!");
  await page.getByRole("main").getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("**/");
}

test("anonymous visitors are redirected to /login", async ({ page }) => {
  await page.goto("/admin/products");
  await page.waitForURL("**/login");
});

test("an authenticated non-admin sees Access Denied, not the product list", async ({ page }) => {
  await skipOnboardingTour(page);
  await registerAndLogin(page, uniqueEmail("customer"), false);

  await page.goto("/admin/products");
  await expect(page.getByText(/don't have access/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Products" })).toHaveCount(0);
});

test("admin: full product lifecycle — draft is hidden from /menu, publish makes it visible, archive removes it again", async ({ page }) => {
  await skipOnboardingTour(page);
  await registerAndLogin(page, uniqueEmail("admin"), true);

  await page.goto("/admin/products");
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();

  await page.getByRole("link", { name: "New product" }).click();
  const sku = `E2E-${Date.now()}`;
  const name = `E2E Lifecycle ${Date.now()}`;
  await page.getByLabel("SKU").fill(sku);
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Category").click();
  await page.getByRole("option").first().click();
  await page.getByLabel("Price").fill("4.25");
  await page.getByLabel("Tagline").fill("A tagline for testing.");
  await page.getByLabel("Description").fill("A description for testing.");
  await page.getByRole("button", { name: "Create product" }).click();
  await page.waitForURL("**/admin/products/*");
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.getByText("draft", { exact: true })).toBeVisible();
  const productUrl = page.url();

  await page.goto("/menu");
  await expect(page.getByText(name)).toHaveCount(0);

  await page.goto(productUrl);
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("published", { exact: true })).toBeVisible();

  await page.goto("/menu");
  await expect(page.getByText(name).first()).toBeVisible();

  await page.goto(productUrl);
  await page.getByRole("button", { name: "Archive" }).click();
  await expect(page.getByText("archived", { exact: true })).toBeVisible();

  await page.goto("/menu");
  await expect(page.getByText(name)).toHaveCount(0);
});

test("admin: categories page loads the real categories", async ({ page }) => {
  await skipOnboardingTour(page);
  await registerAndLogin(page, uniqueEmail("admin"), true);

  await page.goto("/admin/categories");
  await expect(page.getByText("espresso")).toBeVisible();
  await expect(page.getByText("cold-brew")).toBeVisible();
  await expect(page.getByText("seasonal")).toBeVisible();
  await expect(page.getByText("tea")).toBeVisible();
});

test("admin: ingredients page loads the real ingredients", async ({ page }) => {
  await skipOnboardingTour(page);
  await registerAndLogin(page, uniqueEmail("admin"), true);

  await page.goto("/admin/ingredients");
  await expect(page.getByText("foam")).toBeVisible();
  await expect(page.getByText("syrup")).toBeVisible();
});
