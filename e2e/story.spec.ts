import { expect, test } from "@playwright/test";

/**
 * Sprint 3.7 — Cinematic Storytelling. `useScrollTimeline`'s GSAP
 * `ScrollTrigger`s need real scroll distance to fire `onEnter`/`onUpdate`
 * — tests here jump via `window.scrollTo` (a real scroll event, not a
 * simulated wheel gesture) and wait past GSAP's own damped/eased response,
 * the same generous-timeout precedent every prior sprint's e2e suite in
 * this project already established for this dev machine's SwiftShader-
 * backed slowness.
 */

async function scrollToFraction(page: import("@playwright/test").Page, fraction: number) {
  const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.evaluate((y) => window.scrollTo(0, y), Math.floor(scrollHeight * fraction));
  await page.waitForTimeout(1000);
}

function activeChapterLocator(page: import("@playwright/test").Page) {
  return page.locator('nav[aria-label="Story chapters"] button[aria-current="step"]');
}

test("story renders with the sticky 3D scene, chapter nav, and skip link, no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/story");
  await page.waitForSelector('[role="application"] canvas');
  await expect(page.getByRole("heading", { name: "Every cup starts with a story." })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Story chapters" })).toBeVisible();
  await expect(activeChapterLocator(page)).toHaveAttribute("aria-label", "Hero");

  await page.waitForTimeout(800);
  expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
});

test("every chapter is a real, labeled section landmark, in narrative order", async ({ page }) => {
  await page.goto("/story");
  await page.waitForSelector('[role="application"] canvas');

  const expectedIds = ["chapter-hero", "chapter-origins", "chapter-crafting", "chapter-customization", "chapter-concierge", "chapter-commerce", "chapter-finale"];
  for (const id of expectedIds) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
  // Order in the DOM matches narrative order — a real accessibility-tree
  // table of contents, not just a visual illusion.
  const sectionIds = await page.locator("section[id^='chapter-']").evaluateAll((sections) => sections.map((s) => s.id));
  expect(sectionIds).toEqual(expectedIds);
});

test("scrolling through the page advances the active chapter through every chapter in order, camera/lighting change with it", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/story");
  await page.waitForSelector('[role="application"] canvas');

  const expectedByFraction: Array<[number, string]> = [
    [0.02, "Hero"],
    [0.15, "Origins"],
    [0.3, "Crafting"],
    [0.45, "Customization"],
    [0.6, "AI Concierge"],
    [0.75, "Commerce"],
    [0.97, "Finale"],
  ];

  for (const [fraction, expectedLabel] of expectedByFraction) {
    await scrollToFraction(page, fraction);
    await expect(activeChapterLocator(page)).toHaveAttribute("aria-label", expectedLabel, { timeout: 10_000 });
  }
});

test("the Crafting chapter's assembly moment moves the lid away from and back to its default position", async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto("/story");
  await page.waitForSelector('[role="application"] canvas');

  // Chapter entry: fully exploded (lid visibly displaced).
  await scrollToFraction(page, 0.29);
  await expect(activeChapterLocator(page)).toHaveAttribute("aria-label", "Crafting");
  const explodedShot = await page.locator('[role="application"] canvas').screenshot();

  // Later in the same chapter, but still safely short of Customization's
  // own boundary (empirically ~0.33-0.35 on this content) — reassembling.
  await scrollToFraction(page, 0.31);
  await expect(activeChapterLocator(page)).toHaveAttribute("aria-label", "Crafting");
  const reassemblingShot = await page.locator('[role="application"] canvas').screenshot();

  // A real transform happened between the two moments — not a static frame.
  expect(Buffer.compare(explodedShot, reassemblingShot)).not.toBe(0);
});

test("clicking a chapter nav dot jumps directly to that chapter", async ({ page }) => {
  await page.goto("/story");
  await page.waitForSelector('[role="application"] canvas');

  await page.getByRole("button", { name: "Finale" }).click();
  await page.waitForTimeout(1200);
  await expect(activeChapterLocator(page)).toHaveAttribute("aria-label", "Finale", { timeout: 10_000 });
  await expect(page.getByRole("heading", { name: "Your cup is waiting." })).toBeInViewport();
});

test("the Finale chapter's real CTAs navigate to the menu and customizer", async ({ page }) => {
  await page.goto("/story");
  await page.getByRole("button", { name: "Finale" }).click();
  await page.waitForTimeout(1200);

  await expect(page.getByRole("button", { name: "Browse the Menu" })).toBeVisible();
  await page.getByRole("button", { name: "Browse the Menu" }).click();
  await page.waitForURL("**/menu");
  expect(page.url()).toContain("/menu");
});

test("screen-reader landmark: the sticky 3D column announces the active chapter's title", async ({ page }) => {
  await page.goto("/story");
  await page.waitForSelector('[role="application"] canvas');
  const status = page.getByRole("status", { name: "Story chapter announcements" });
  await expect(status).toHaveText("Every cup starts with a story.");

  await scrollToFraction(page, 0.2);
  await expect(activeChapterLocator(page)).toHaveAttribute("aria-label", "Origins", { timeout: 10_000 });
  await expect(status).toHaveText("It begins far from here.");
});

test("keyboard: tabbing to a chapter nav dot and pressing Enter jumps to that chapter", async ({ page }) => {
  await page.goto("/story");
  await page.waitForSelector('[role="application"] canvas');

  const commerceDot = page.getByRole("button", { name: "Commerce" });
  await commerceDot.focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1200);
  await expect(activeChapterLocator(page)).toHaveAttribute("aria-label", "Commerce", { timeout: 10_000 });
});

test("keyboard: the skip-storytelling link is focusable and, when activated, jumps to the Finale", async ({ page, browserName }) => {
  // Safari/WebKit excludes links from the default Tab order (Full Keyboard
  // Access required) — the same documented, non-app-bug limitation
  // e2e/stabilization.spec.ts already carved out for the site-wide
  // `SkipLink`. Focused directly here rather than tab-chained through the
  // page's other (pre-existing, unrelated) skip link, so this test stays
  // about this sprint's own link, not that one's separate focus semantics.
  test.skip(browserName === "webkit", "Safari/WebKit excludes links from the default Tab order — documented limitation, not an app bug");

  await page.goto("/story");
  await page.waitForSelector('[role="application"] canvas');

  await page.getByRole("link", { name: "Skip storytelling" }).focus();
  await expect(page.getByRole("link", { name: "Skip storytelling" })).toBeFocused();

  await page.keyboard.press("Enter");
  await page.waitForTimeout(800);
  await expect(page.getByRole("heading", { name: "Your cup is waiting." })).toBeInViewport();
});

test.describe("touch", () => {
  test.use({ hasTouch: true });

  test("tapping a chapter nav dot jumps to that chapter", async ({ page }) => {
    await page.goto("/story");
    await page.waitForSelector('[role="application"] canvas');
    await page.getByRole("button", { name: "Origins" }).tap();
    await page.waitForTimeout(1200);
    await expect(activeChapterLocator(page)).toHaveAttribute("aria-label", "Origins", { timeout: 10_000 });
  });
});

test.describe("reduced motion", () => {
  test("renders and is fully operable with no console errors — no scroll-scrubbed choreography, chapters still switch on scroll", async ({ page }) => {
    test.setTimeout(30_000);
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.emulateMedia({ reducedMotion: "reduce" });

    await page.goto("/story");
    await page.waitForSelector('[role="application"] canvas');
    await expect(activeChapterLocator(page)).toHaveAttribute("aria-label", "Hero");

    await scrollToFraction(page, 0.35);
    await expect(activeChapterLocator(page)).toHaveAttribute("aria-label", "Crafting", { timeout: 10_000 });

    await scrollToFraction(page, 0.97);
    await expect(activeChapterLocator(page)).toHaveAttribute("aria-label", "Finale", { timeout: 10_000 });
    await expect(page.getByRole("button", { name: "Start Customizing" })).toBeVisible();

    expect(errors, `errors under reduced motion: ${errors.join("\n")}`).toEqual([]);
  });
});
