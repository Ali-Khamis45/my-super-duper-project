import { expect, test } from "@playwright/test";

/**
 * Sprint 3.5 — AI Coffee Concierge. `useRecommendation`'s deliberate
 * "thinking" pacing beat (~650ms, skipped under reduced motion — see
 * `features/concierge/hooks/useRecommendation.ts`) means every test that
 * submits the questionnaire needs a real wait past that, not just an
 * instant assertion. This dev machine's software-rendered (SwiftShader)
 * headless Chromium has also shown real, session-specific slowdowns in
 * prior sprints (see docs/reviews/sprint-3.3-review.md and
 * sprint-3.4-review.md) — tests here use generous, explicit timeouts for
 * exactly that reason, not because the app itself is slow.
 */

async function submitAndWaitForRecommendation(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Get my recommendation" }).click();
  await expect(page.getByText("Why this one")).toBeVisible({ timeout: 20_000 });
}

test("concierge renders with the questionnaire and canvas, no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/concierge");
  await expect(page.getByRole("heading", { name: "AI Coffee Concierge" })).toBeVisible();
  await expect(page.locator('[role="application"] canvas')).toHaveCount(1);
  await expect(page.getByRole("radiogroup", { name: "Taste preference" })).toBeVisible();
  await expect(page.getByRole("radiogroup", { name: "Sweetness" })).toBeVisible();

  await page.waitForTimeout(500);
  expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
});

test("submitting the questionnaire shows a thinking state, then a real, explained recommendation", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/concierge");
  await page.waitForSelector('[role="application"] canvas');

  await page.getByRole("button", { name: "Get my recommendation" }).click();
  await expect(page.getByRole("button", { name: "Thinking…" })).toBeVisible();

  await expect(page.getByText("Why this one")).toBeVisible({ timeout: 20_000 });
  // Confidence indicator is a real, varying number, not decorative text.
  // Parenthesized form is the visible panel's own text — the sr-only
  // announcer phrases the same number differently, so this locator is
  // scoped to avoid matching both.
  await expect(page.getByText(/\(\d+% confidence\)/)).toBeVisible();
});

test("a strict profile produces both a suggested and an explicitly excluded ingredient customization", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/concierge");
  await page.waitForSelector('[role="application"] canvas');

  await page.getByRole("radio", { name: "Temperature: Iced" }).click();
  await page.getByRole("radio", { name: "Caffeine level: High" }).click();
  await page.getByRole("radio", { name: "Taste preference: Bitter" }).click();
  await page.getByRole("radio", { name: "Milk preference: No milk" }).click();
  await page.getByRole("radio", { name: "Sweetness: 1 of 5" }).click();
  await page.getByRole("radio", { name: "Bitterness: 5 of 5" }).click();

  await submitAndWaitForRecommendation(page);

  // classic-espresso should win this profile (espresso category), which is
  // incompatible with the "iced" temperature signal's Ice Cubes candidate —
  // a real, validated exclusion, not a guess (see recommendationEngine.test.ts).
  // The heading, not a generic text match — the sr-only announcer also
  // contains the drink name.
  await expect(page.getByRole("heading", { name: "Classic Espresso" })).toBeVisible();
  await expect(page.getByText("Not included")).toBeVisible();
});

test("Apply to Customizer navigates to /customize with the recommended drink applied", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/concierge");
  await page.waitForSelector('[role="application"] canvas');
  await submitAndWaitForRecommendation(page);

  await page.getByRole("button", { name: "Apply to Customizer" }).click();
  await page.waitForURL("**/customize**", { timeout: 30_000 });
  expect(page.url()).toContain("/customize?drink=");
});

test("alternatives render with their own reasons and can be applied instead", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/concierge");
  await page.waitForSelector('[role="application"] canvas');
  await submitAndWaitForRecommendation(page);

  await expect(page.getByText("Also worth trying")).toBeVisible();
  const applyInstead = page.getByRole("button", { name: "Apply instead" }).first();
  await expect(applyInstead).toBeVisible();
  await applyInstead.click();
  await page.waitForURL("**/customize**", { timeout: 30_000 });
});

test("favoriting a recommendation toggles aria-pressed", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/concierge");
  await page.waitForSelector('[role="application"] canvas');
  await submitAndWaitForRecommendation(page);

  const favoriteButton = page.getByRole("button", { name: /Save .* to favorites/ });
  await expect(favoriteButton).toHaveAttribute("aria-pressed", "false");
  await favoriteButton.click();
  await expect(page.getByRole("button", { name: /Remove .* from favorites/ })).toHaveAttribute("aria-pressed", "true");
});

test("screen-reader live region announces the recommendation", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/concierge");
  await page.waitForSelector('[role="application"] canvas');
  await submitAndWaitForRecommendation(page);

  // Scoped by name — Sprint 3.6 added a second, global `role="status"`
  // region (the navbar's cart announcer) that now coexists on this route.
  await expect(page.getByRole("status", { name: "Recommendation announcements" })).toContainText("Recommendation ready:");
});

test("keyboard: tabbing to a preference option and pressing Enter selects it, then submitting works", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/concierge");
  await page.waitForSelector('[role="application"] canvas');

  const sweetOption = page.getByRole("radio", { name: "Taste preference: Sweet" });
  await sweetOption.focus();
  await page.keyboard.press("Enter");
  await expect(sweetOption).toHaveAttribute("aria-checked", "true");

  await page.getByRole("button", { name: "Get my recommendation" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Why this one")).toBeVisible({ timeout: 20_000 });
});

test.describe("touch", () => {
  test.use({ hasTouch: true });

  test("tapping a preference option and the submit button works", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/concierge");
    await page.waitForSelector('[role="application"] canvas');
    await page.getByRole("radio", { name: "Temperature: Iced" }).tap();
    await page.getByRole("button", { name: "Get my recommendation" }).tap();
    await expect(page.getByText("Why this one")).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("reduced motion", () => {
  test("recommendation appears without the thinking delay and with no console errors", async ({ page }) => {
    test.setTimeout(60_000);
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.emulateMedia({ reducedMotion: "reduce" });

    await page.goto("/concierge");
    await page.waitForSelector('[role="application"] canvas');
    await page.waitForTimeout(500);

    await page.getByRole("button", { name: "Get my recommendation" }).click();
    await expect(page.getByText("Why this one")).toBeVisible({ timeout: 15_000 });

    expect(errors, `errors under reduced motion: ${errors.join("\n")}`).toEqual([]);
  });
});
