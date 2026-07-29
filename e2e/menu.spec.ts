import { expect, test } from "@playwright/test";

/** Sprint 3.1 — Product Catalog Experience. Reuses the harness Sprint 2.6 installed. */

test("menu loads with the full catalog and no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/menu");
  await expect(page.getByRole("heading", { name: /every cup, before you order it/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /view details for/i })).toHaveCount(14);

  expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
});

// Real keyboard typing (`page.keyboard.type`), not `.fill()` — confirmed by
// direct investigation that Playwright's `.fill()` on a `type="search"`
// input doesn't reliably dispatch a change event WebKit's Base UI `Input`
// primitive picks up (the DOM value updates, the input's own onChange
// never fires), while real typing works correctly in all 3 engines. A
// Playwright/WebKit/`type="search"` tooling quirk, not a real Safari bug —
// confirmed separately that real keystrokes filter correctly.
test("search narrows the catalog to matching drinks only", async ({ page }) => {
  await page.goto("/menu");
  await page.getByLabel("Search the menu").click();
  await page.keyboard.type("matcha", { delay: 20 });
  await expect(page.getByRole("button", { name: /view details for matcha latte/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /view details for/i })).toHaveCount(1);
});

test("an unmatched search shows the empty state, not a blank grid", async ({ page }) => {
  await page.goto("/menu");
  await page.getByLabel("Search the menu").click();
  await page.keyboard.type("xyz-nonexistent-drink", { delay: 20 });
  await expect(page.getByText(/nothing matches/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /view details for/i })).toHaveCount(0);
});

test("category filter narrows the catalog and marks itself active", async ({ page }) => {
  await page.goto("/menu");
  const teaFilter = page.getByRole("button", { name: "Tea", exact: true });
  await teaFilter.click();
  await expect(teaFilter).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /view details for/i })).toHaveCount(3);
});

test("selecting a drink opens its detail dialog with matching content", async ({ page }) => {
  await page.goto("/menu");
  await page.getByRole("button", { name: /view details for classic espresso/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Classic Espresso")).toBeVisible();
  // `Button`'s `nativeButton={false}` applies `role="button"` regardless of
  // the underlying rendered tag (an <a> here, via `render={<Link .../>}`) —
  // the same convention as the existing "Order Now" hero CTA, confirmed by
  // inspecting the live accessibility tree, not assumed.
  await expect(dialog.getByRole("button", { name: /customize this drink/i })).toHaveAttribute("href", "/customize");

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});
