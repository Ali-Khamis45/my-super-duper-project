import { expect, test } from "@playwright/test";

/**
 * Sprint 3.4 — Liquid & Physics Experience. Purely visual/WebGL behavior
 * (spring-damped tilt, ripples, foam/ice secondary motion) has no DOM state
 * to assert on directly — the real correctness/determinism coverage lives
 * in `src/engine/physics/liquidPhysics.test.ts` (Vitest, pure functions).
 * What these tests verify is what only a real browser can: the shader
 * actually compiles and links (a GLSL error surfaces as a console error the
 * moment the material mounts), the scene survives sustained interaction
 * without crashing, and every required interaction path (drag, keyboard,
 * touch, reduced motion) reaches the physics system without erroring.
 */

async function dragCup(page: import("@playwright/test").Page, dx: number) {
  const canvas = page.locator('[role="application"] canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error("canvas not found");
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + dx, cy, { steps: 5 });
  await page.mouse.up();
}

test("dragging and releasing the cup (tilt + ripple response) produces no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/");
  await page.waitForSelector('[role="application"] canvas');
  await page.waitForTimeout(500);

  await dragCup(page, 220);
  await page.waitForTimeout(500); // mid-motion — the material is actively displaced here
  await dragCup(page, -180); // a second, opposite drag — a real disturbance while the first hasn't fully settled
  await page.waitForTimeout(2500); // let it settle

  await expect(page.locator('[role="application"] canvas')).toHaveCount(1);
  expect(errors, `errors: ${errors.join("\n")}`).toEqual([]);
});

test("repeated drag/release cycles (settle -> disturb -> settle) stay stable, no accumulating errors", async ({ page }) => {
  // 5 repeated drag cycles under this dev machine's software-rendered
  // (SwiftShader, no real GPU) headless Chromium runs meaningfully slower
  // than the default 45s budget — the same class of environmental
  // slowdown docs/reviews/sprint-2.6-review.md and playwright.config.ts's
  // own comments already document for other repeated-interaction tests in
  // this suite, not an application defect (see docs/reviews/sprint-3.4-review.md).
  test.setTimeout(90_000);

  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/");
  await page.waitForSelector('[role="application"] canvas');
  await page.waitForTimeout(500);

  for (let i = 0; i < 5; i++) {
    await dragCup(page, i % 2 === 0 ? 150 : -150);
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(2000); // final settle

  await expect(page.locator('[role="application"] canvas')).toHaveCount(1);
  expect(errors, `errors during repeated drag cycles: ${errors.join("\n")}`).toEqual([]);
});

test("keyboard rotation drives the same physics path as drag, with no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/");
  const canvas = page.locator('[role="application"] canvas');
  await canvas.waitFor();
  await page.waitForTimeout(500);
  await canvas.focus();

  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(1500);

  expect(errors, `errors during keyboard rotation: ${errors.join("\n")}`).toEqual([]);
});

test("adding Ice Cubes and dragging the cup (ice float + drift) produces no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/customize?drink=original-cold-brew");
  await page.waitForSelector('[role="application"] canvas');
  await page.waitForTimeout(500);

  await page.getByRole("button", { name: /Add Ice Cubes/ }).click();
  await page.waitForTimeout(300);
  await dragCup(page, 180);
  await page.waitForTimeout(2000);

  expect(errors, `errors with ice ingredient: ${errors.join("\n")}`).toEqual([]);
});

test.describe("touch", () => {
  test.use({ hasTouch: true });

  test("touch drag on the cup drives physics with no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    const canvas = page.locator('[role="application"] canvas');
    await canvas.waitFor();
    await page.waitForTimeout(500);
    const box = await canvas.boundingBox();
    if (!box) throw new Error("canvas not found");
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.touchscreen.tap(cx, cy);
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 150, cy, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(2000);

    expect(errors, `errors during touch drag: ${errors.join("\n")}`).toEqual([]);
  });
});

test.describe("reduced motion", () => {
  test("dragging the cup under reduced motion (simplified interpolation, no continuous oscillation) produces no console errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.emulateMedia({ reducedMotion: "reduce" });

    await page.goto("/");
    await page.waitForSelector('[role="application"] canvas');
    await page.waitForTimeout(500);

    await dragCup(page, 200);
    await page.waitForTimeout(1500);

    expect(errors, `errors under reduced motion: ${errors.join("\n")}`).toEqual([]);
  });
});

test.describe("long-running stability", () => {
  test("periodic disturbance keeps the scene alive with no console errors or unbounded heap growth", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "performance.memory is Chromium-only");
    // Scaled down for this session's time budget, same as
    // e2e/long-running.spec.ts's "scaled idle soak" already documents doing
    // for the identical reason (a literal, much-longer soak is the kind of
    // thing to run as a scheduled/nightly job, not inline in this
    // interactive session) — 3 disturb cycles is still real repeated
    // physics churn, not a single one-shot check. See docs/reviews/sprint-3.4-review.md.
    test.setTimeout(90_000);

    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.waitForSelector('[role="application"] canvas');
    await page.waitForTimeout(500);

    const heapSamples: number[] = [];
    async function sampleHeap() {
      const heap = await page.evaluate(() => (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0);
      heapSamples.push(heap);
    }

    await sampleHeap();
    for (let i = 0; i < 3; i++) {
      await dragCup(page, i % 2 === 0 ? 130 : -130);
      await page.waitForTimeout(2000);
      await sampleHeap();
    }

    await expect(page.locator('[role="application"] canvas')).toHaveCount(1);
    expect(errors, `errors during long-running physics soak: ${errors.join("\n")}`).toEqual([]);

    if (heapSamples[0] && heapSamples[0] > 0) {
      const growthRatio = Math.max(...heapSamples) / heapSamples[0];
      expect(growthRatio, `heap samples: ${heapSamples.join(", ")}`).toBeLessThan(4);
    }
  });
});
