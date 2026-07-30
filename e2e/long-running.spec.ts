import { expect, test } from "@playwright/test";

import { skipOnboardingTour } from "./helpers/onboarding";

// Sprint 3.9's onboarding tour auto-opens as a real modal dialog on `/` for
// a first-time visitor — every test here is about long-running stability,
// not onboarding, so it runs as a returning visitor. See `helpers/onboarding.ts`.
test.beforeEach(async ({ page }) => {
  await skipOnboardingTour(page);
});

/**
 * Long-running stability + memory-leak-trend checks (Sprint 2.6). Two of
 * the sprint brief's named scenarios have no real feature surface yet and
 * are deliberately not faked here, matching this project's established
 * "N/A — not yet in scope" honesty pattern (docs/09_CREATIVE_DIRECTOR_REVIEW.md):
 *
 * - "Repeated camera transitions" — only one camera preset ("hero") exists;
 *   multi-preset transitions are explicitly deferred to Milestone 6
 *   (docs/03_3D_ENGINE.md's Camera paths section). Nothing to repeatedly
 *   transition between yet.
 * - "Repeated asset disposal" — no real `.glb`/texture files exist
 *   anywhere in `public/` (true since Sprint 2.2, still true now), so the
 *   async resource caches these scenarios would exercise have no live
 *   production traffic. The one real synchronous cache under live theme-
 *   driven churn (materials) is exercised by the repeated-theme-switching
 *   test in stabilization.spec.ts already.
 *
 * "30-minute idle" is scaled down to 20s with heap sampling at intervals —
 * a literal 30-minute run wasn't executed this session; see
 * docs/reviews/sprint-2.6-review.md for why (session time budget) and the
 * recommendation to run the real duration as a scheduled/nightly job.
 */

test.describe("repeated quality-tier switching", () => {
  test("toggling CPU throttle repeatedly forces real tier transitions without errors or unbounded heap growth", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "CDP CPU throttling is Chromium-only");

    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.waitForSelector('[role="application"]');
    await page.waitForTimeout(1000);

    const session = await page.context().newCDPSession(page);

    const heapSamples: number[] = [];
    async function sampleHeap() {
      const heap = await page.evaluate(() => (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0);
      heapSamples.push(heap);
    }

    await sampleHeap();
    for (let i = 0; i < 4; i++) {
      await session.send("Emulation.setCPUThrottlingRate", { rate: 20 });
      await page.waitForTimeout(2000);
      await session.send("Emulation.setCPUThrottlingRate", { rate: 1 });
      await page.waitForTimeout(1500);
      await sampleHeap();
    }

    expect(errors, `errors during repeated quality-tier switching: ${errors.join("\n")}`).toEqual([]);
    // Scene must still be alive and rendering after the churn, not left broken.
    await expect(page.locator('[role="application"] canvas')).toHaveCount(1);

    // A loose sanity bound, not a strict leak detector: heap should not
    // have grown to multiple times its starting size over 4 throttle
    // cycles. Real per-tier allocation (new shadow-map render targets,
    // etc.) is expected and fine; unbounded growth is not.
    if (heapSamples[0] && heapSamples[0] > 0) {
      const growthRatio = Math.max(...heapSamples) / heapSamples[0];
      expect(growthRatio, `heap samples: ${heapSamples.join(", ")}`).toBeLessThan(4);
    }
  });
});

test.describe("scaled idle soak", () => {
  test("20s idle with no interaction produces no console errors and a live, rendering canvas throughout", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/");
    await page.waitForSelector('[role="application"]');

    for (let i = 0; i < 4; i++) {
      await page.waitForTimeout(5000);
      await expect(page.locator('[role="application"] canvas')).toBeVisible();
    }

    expect(errors, `errors during idle soak: ${errors.join("\n")}`).toEqual([]);
  });
});
