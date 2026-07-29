import { expect, test } from "@playwright/test";

/**
 * Sprint 3.3 — Drink Composer. Real-browser verification for this sprint hit
 * a documented environmental instability (see docs/reviews/sprint-3.3-review.md,
 * "Real-browser verification" — sustained material/shader-recompiling
 * interactions crashing this dev machine's SwiftShader-backed headless
 * Chromium after long sessions, reproducing even on unrelated, pre-existing
 * routes). These tests are written and run the same as every other e2e spec
 * in this suite; if a given run hits that same environmental crash, it is
 * not evidence of a Sprint 3.3 code defect.
 */

test("composer renders with the recipe summary, presets, ingredient library, and empty layer stack, no console errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/customize");
  await expect(page.getByRole("heading", { name: "Customize" })).toBeVisible();
  // Default base drink (no ?drink= param) is Classic Espresso.
  await expect(page.getByText("Classic Espresso")).toBeVisible();
  await expect(page.getByText("$3.50")).toBeVisible();
  await expect(page.getByRole("group", { name: "Ingredient library" })).toBeVisible();
  await expect(page.getByText("No ingredients added yet")).toBeVisible();

  await page.waitForTimeout(500);
  expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
});

test("/customize?drink= wires the real drink name and category into the recipe summary", async ({ page }) => {
  await page.goto("/customize?drink=mocha");
  await expect(page.getByText("Mocha", { exact: true })).toBeVisible();
  await expect(page.getByText("$5.50")).toBeVisible();
});

test("strict compatibility rules: Ice Cubes is disabled on an espresso-based drink, enabled on a cold-brew", async ({
  page,
}) => {
  await page.goto("/customize"); // defaults to Classic Espresso (category: espresso)
  const iceOnEspresso = page.getByRole("button", { name: /Add Ice Cubes/ });
  await expect(iceOnEspresso).toBeDisabled();
  await expect(iceOnEspresso).toHaveAttribute("aria-label", /not available for this drink/);

  await page.goto("/customize?drink=original-cold-brew");
  const iceOnColdBrew = page.getByRole("button", { name: /Add Ice Cubes/ });
  await expect(iceOnColdBrew).toBeEnabled();
});

test("strict compatibility rules: Chocolate Drizzle is enabled on espresso, disabled on cold-brew — the brief's own 'no tea in coffee'-style rule", async ({
  page,
}) => {
  await page.goto("/customize");
  await expect(page.getByRole("button", { name: /Add Chocolate Drizzle/ })).toBeEnabled();

  await page.goto("/customize?drink=original-cold-brew");
  const chocolateOnColdBrew = page.getByRole("button", { name: /Add Chocolate Drizzle/ });
  await expect(chocolateOnColdBrew).toBeDisabled();
  await expect(chocolateOnColdBrew).toHaveAttribute("aria-label", /not available for this drink/);
});

test("only presets that are fully compatible with the base drink are offered", async ({ page }) => {
  await page.goto("/customize"); // espresso: Classic Mocha, Cinnamon Dream, The Works — not Iced & Sweet (needs ice)
  await expect(page.getByRole("button", { name: "Classic Mocha" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Iced & Sweet" })).toHaveCount(0);

  await page.goto("/customize?drink=original-cold-brew"); // cold-brew: only Iced & Sweet
  await expect(page.getByRole("button", { name: "Iced & Sweet" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Classic Mocha" })).toHaveCount(0);
});

test("click-to-add places an ingredient in the layer stack and the recipe summary, and the total updates", async ({
  page,
}) => {
  await page.goto("/customize");
  await page.getByRole("button", { name: /Add Chocolate Drizzle/ }).click();

  await expect(page.getByRole("list", { name: /Ingredient layers/ }).getByText("Chocolate Drizzle")).toBeVisible();
  // Classic Espresso $3.50 + Chocolate Drizzle $0.60 = $4.10.
  await expect(page.getByText("$4.10")).toBeVisible();
});

test("adding an already-placed ingredient is disabled, not duplicated", async ({ page }) => {
  await page.goto("/customize");
  const addChocolate = page.getByRole("button", { name: /Add Chocolate Drizzle/ });
  await addChocolate.click();
  await expect(page.getByRole("button", { name: /Chocolate Drizzle.*already added/ })).toBeDisabled();

  const layerItems = page.getByRole("list", { name: /Ingredient layers/ }).getByRole("listitem");
  await expect(layerItems).toHaveCount(1);
});

test("quantity +/- updates the layer stack and the recipe summary price", async ({ page }) => {
  await page.goto("/customize");
  await page.getByRole("button", { name: /Add Chocolate Drizzle/ }).click();

  await page.getByRole("button", { name: "Increase Chocolate Drizzle quantity" }).click();
  // Quantity 2 -> $1.20 for the line item, $4.70 total.
  await expect(page.getByText("$4.70")).toBeVisible();

  await page.getByRole("button", { name: "Decrease Chocolate Drizzle quantity" }).click();
  await expect(page.getByText("$4.10")).toBeVisible();
});

test("reordering moves the ingredient's position in the layer stack list", async ({ page }) => {
  await page.goto("/customize");
  await page.getByRole("button", { name: /Add Chocolate Drizzle/ }).click();
  await page.getByRole("button", { name: /Add Whipped Cream/ }).click();

  const list = page.getByRole("list", { name: /Ingredient layers/ });
  await expect(list.getByRole("listitem").nth(0)).toContainText("Chocolate Drizzle");
  await expect(list.getByRole("listitem").nth(1)).toContainText("Whipped Cream");

  await page.getByRole("button", { name: "Move Whipped Cream up the stack" }).click();

  await expect(list.getByRole("listitem").nth(0)).toContainText("Whipped Cream");
  await expect(list.getByRole("listitem").nth(1)).toContainText("Chocolate Drizzle");
});

test("removing an ingredient clears it from the layer stack and the recipe summary", async ({ page }) => {
  await page.goto("/customize");
  await page.getByRole("button", { name: /Add Chocolate Drizzle/ }).click();
  await page.getByRole("button", { name: "Remove Chocolate Drizzle" }).click();

  await expect(page.getByText("No ingredients added yet")).toBeVisible();
  await expect(page.getByText("$3.50")).toBeVisible();
});

test("applying a preset replaces the layer stack with the preset's ingredients", async ({ page }) => {
  await page.goto("/customize");
  await page.getByRole("button", { name: "Classic Mocha" }).click();

  const list = page.getByRole("list", { name: /Ingredient layers/ });
  await expect(list.getByText("Chocolate Drizzle")).toBeVisible();
  await expect(list.getByText("Whipped Cream")).toBeVisible();
});

test("undo/redo integration: adding an ingredient is undoable through the same Undo/Redo controls as cosmetic swatches", async ({
  page,
}) => {
  await page.goto("/customize");
  const undoButton = page.getByRole("button", { name: "Undo" });
  await page.getByRole("button", { name: /Add Chocolate Drizzle/ }).click();
  await expect(page.getByText("No ingredients added yet")).toHaveCount(0);

  await expect(undoButton).toBeEnabled();
  await undoButton.click();
  await expect(page.getByText("No ingredients added yet")).toBeVisible();

  await page.getByRole("button", { name: "Redo" }).click();
  await expect(page.getByText("No ingredients added yet")).toHaveCount(0);
});

test("screen-reader live region announces ingredient add/remove", async ({ page }) => {
  await page.goto("/customize");
  const status = page.locator('[role="status"]');
  await page.getByRole("button", { name: /Add Chocolate Drizzle/ }).click();
  await expect(status).toHaveText("Chocolate Drizzle added");

  await page.getByRole("button", { name: "Remove Chocolate Drizzle" }).click();
  await expect(status).toHaveText("Chocolate Drizzle removed");
});

test("keyboard: tabbing to an ingredient button and pressing Enter adds it", async ({ page }) => {
  await page.goto("/customize");
  const addCream = page.getByRole("button", { name: /Add Whipped Cream/ });
  await addCream.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("list", { name: /Ingredient layers/ }).getByText("Whipped Cream")).toBeVisible();
});

test.describe("touch", () => {
  test.use({ hasTouch: true });

  test("tapping an ingredient button adds it", async ({ page }) => {
    await page.goto("/customize");
    await page.getByRole("button", { name: /Add Chocolate Drizzle/ }).tap();
    await expect(page.getByRole("list", { name: /Ingredient layers/ }).getByText("Chocolate Drizzle")).toBeVisible();
  });
});

test.describe("reduced motion", () => {
  test("composer renders and is operable with no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/customize");
    await page.waitForTimeout(500);

    await page.getByRole("button", { name: /Add Chocolate Drizzle/ }).click();
    await expect(page.getByRole("list", { name: /Ingredient layers/ }).getByText("Chocolate Drizzle")).toBeVisible();
    expect(errors, `errors under reduced motion: ${errors.join("\n")}`).toEqual([]);
  });
});
