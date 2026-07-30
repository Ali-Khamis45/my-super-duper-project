import { expect, test } from "@playwright/test";

import { skipOnboardingTour } from "./helpers/onboarding";

/**
 * Sprint 5.1 — Authentication & Identity Platform. These tests exercise the real backend
 * (docs/33_AUTH_ARCHITECTURE.md's endpoints), not a mock — the same discipline this suite
 * already applies elsewhere (no placeholder/simulated network calls). Requires the backend API
 * (`dotnet run` in `backend/src/Coffeshop.Api`) and its docker-compose dev stack running
 * locally; skipped in environments where that's not true would be a future addition if this
 * suite ever runs somewhere the backend isn't available.
 */

function uniqueEmail() {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
}

test("register shows validation errors for a weak password, then succeeds with a strong one", async ({ page }) => {
  await page.goto("/register");

  await page.getByLabel("Full name").fill("Playwright Tester");
  await page.getByLabel("Email").fill(uniqueEmail());
  await page.getByLabel("Password").fill("weak");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText(/must contain an uppercase letter/i)).toBeVisible();

  await page.getByLabel("Password").fill("Valid1Pass!");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
});

test("register with an already-registered email shows a real server error", async ({ page }) => {
  const email = uniqueEmail();

  await page.goto("/register");
  await page.getByLabel("Full name").fill("First User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Valid1Pass!");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  await page.goto("/register");
  await page.getByLabel("Full name").fill("Second User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Valid1Pass!");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText(/already exists/i)).toBeVisible();
});

test("logging in with an unverified account shows a real 403 error, not a silent failure", async ({ page }) => {
  const email = uniqueEmail();

  await page.goto("/register");
  await page.getByLabel("Full name").fill("Unverified User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Valid1Pass!");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Valid1Pass!");
  // Scoped to <main> — the navbar's own "Log in" link (a Base UI Button rendered as an <a>,
  // which still exposes role="button") otherwise matches the same query.
  await page.getByRole("main").getByRole("button", { name: "Log in" }).click();

  await expect(page.getByText(/has not been verified/i)).toBeVisible();
});

test("forgot-password always shows the same generic success state, real email or not", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill("definitely-not-a-real-account@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();

  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
});

test("navbar shows a Log in link when anonymous, and it navigates to /login", async ({ page }) => {
  await skipOnboardingTour(page);
  await page.goto("/");
  // Base UI's Button primitive exposes role="button" even when rendered as an <a> (via
  // `render={<Link .../>}`) — a real, useful finding from writing this test: querying by
  // role="link" here finds nothing, despite the element genuinely being an anchor.
  const loginLink = page.getByRole("navigation", { name: "Primary" }).getByRole("button", { name: "Log in" });
  await expect(loginLink).toBeVisible();
  await loginLink.click();
  await expect(page).toHaveURL(/\/login$/);
});
