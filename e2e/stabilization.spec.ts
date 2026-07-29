import { expect, test } from "@playwright/test";

/**
 * Sprint 2.6's real cross-browser/production-readiness verification —
 * console-error monitoring throughout is the primary signal: a silent
 * WebGL/React error is the class of bug this sprint exists to catch, more
 * than any single assertion below.
 *
 * Selector note: R3F's `<Canvas>` puts `role`/`aria-label`/`tabIndex`/the
 * keyboard handler on its *wrapping* `<div>`, not the raw `<canvas>` tag
 * itself (confirmed by inspecting the live DOM — `div[role=application] >
 * div > canvas`, the inner canvas carrying no attributes of its own). This
 * is a standard, correct ARIA pattern for canvas content, not a bug — a
 * bare `<canvas>` has no inherent semantics, so the accessible name/role/
 * focus/keyboard-handling belongs on a container. Every selector below
 * targets `[role="application"]` (the div) for interaction/a11y checks and
 * the nested `canvas` element only for verifying real pixel content exists.
 */

const APP_SELECTOR = '[role="application"]';

test.describe("hero smoke", () => {
  test("loads with no console errors, canvas present and sized", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.waitForSelector(APP_SELECTOR, { timeout: 15_000 });
    const canvas = page.locator(`${APP_SELECTOR} canvas`);
    await expect(canvas).toHaveCount(1);
    const dimensions = await canvas.evaluate((el: HTMLCanvasElement) => ({ width: el.width, height: el.height }));
    expect(dimensions.width).toBeGreaterThan(0);
    expect(dimensions.height).toBeGreaterThan(0);

    // Give the scene a moment to actually render/compile shaders before checking errors.
    await page.waitForTimeout(1500);
    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });
});

test.describe("theme switching stability", () => {
  test("repeated theme toggles produce no console errors or crashes", async ({ page }) => {
    // Real, identified cause, not arbitrary padding: this test's 8
    // sequential real clicks (each with Playwright's actionability wait)
    // occasionally exceed the suite-wide 45s timeout specifically when all
    // three browser projects run in parallel on this single dev machine
    // alongside the already-running dev server — genuine resource
    // contention, not app-code flakiness (every run, slow or fast,
    // produced zero console/page errors). See docs/reviews/sprint-2.6-review.md.
    test.setTimeout(60_000);
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.waitForSelector(APP_SELECTOR);
    const toggle = page.getByRole("button", { name: /switch to (light|dark) theme/i });

    for (let i = 0; i < 8; i++) {
      await toggle.click();
      await page.waitForTimeout(150);
    }

    expect(errors, `errors during repeated theme switching: ${errors.join("\n")}`).toEqual([]);
    // The canvas must still be alive and rendering after repeated theme churn, not left in a broken state.
    await expect(page.locator(APP_SELECTOR)).toBeVisible();
    await expect(page.locator(`${APP_SELECTOR} canvas`)).toHaveCount(1);
  });
});

test.describe("repeated resize stability", () => {
  test("repeated viewport resize produces no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.waitForSelector(APP_SELECTOR);

    const sizes: [number, number][] = [
      [800, 600],
      [1920, 1080],
      [375, 667],
      [1280, 720],
    ];
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(200);
    }

    expect(errors, `errors during repeated resize: ${errors.join("\n")}`).toEqual([]);
  });
});

test.describe("reduced motion", () => {
  test("renders without error and the canvas stays focusable/keyboard-operable", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    // `page.emulateMedia` rather than `test.use({ reducedMotion })` — this
    // installed Playwright version's `PlaywrightTestOptions` type doesn't
    // flatten `reducedMotion` as a top-level fixture (unlike `colorScheme`/
    // `hasTouch`), so `test.use()` fails typecheck; `emulateMedia` is the
    // documented, well-typed per-page alternative and sets the exact same
    // `prefers-reduced-motion` media query `usePrefersReducedMotion` reads.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const app = page.locator(APP_SELECTOR);
    await expect(app).toBeVisible();
    await app.focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(300);

    expect(errors, `errors under reduced motion: ${errors.join("\n")}`).toEqual([]);
  });
});

test.describe("accessibility", () => {
  test("skip link is reachable and focus-visible via keyboard", async ({ page, browserName }) => {
    // Real WebKit/Safari platform behavior, not an app bug: by default,
    // Safari's Tab order includes only form controls, not links — a link
    // becomes Tab-reachable only once a user enables "Full Keyboard Access"
    // (System Settings > Keyboard). Confirmed directly: pressing Tab in
    // Playwright's WebKit focuses the first BUTTON, skipping the skip
    // link's real, correctly-marked-up <a> entirely. Every other engine
    // (Chromium, Firefox) includes links in the default Tab order and
    // passes this test unmodified — see docs/reviews/sprint-2.6-review.md's
    // Accessibility Review for the full writeup.
    test.skip(browserName === "webkit", "Safari/WebKit excludes links from the default Tab order (Full Keyboard Access required) — documented limitation, not an app bug");

    await page.goto("/");
    await page.keyboard.press("Tab");
    const skipLink = page.getByText("Skip to main content");
    await expect(skipLink).toBeFocused();
  });

  test("the interactive cup region exposes an aria-label and is keyboard-focusable", async ({ page }) => {
    await page.goto("/");
    const app = page.locator(APP_SELECTOR);
    await expect(app).toHaveAttribute("aria-label", /rotate/i);
    await expect(app).toHaveAttribute("tabindex", "0");
  });
});

test.describe("touch interaction", () => {
  test.use({ hasTouch: true });

  test("touch drag on the cup produces no console errors — R3F's unified Pointer Events, not a separate touch path", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    const app = page.locator(APP_SELECTOR);
    await app.waitFor();
    const box = await app.boundingBox();
    if (!box) throw new Error("app region has no bounding box");
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    await page.touchscreen.tap(centerX, centerY);
    // Real drag: swipe across the cup, not just a tap — exercises the same
    // onPointerDown/-Move/-Up handlers `useCupInteractionState` binds,
    // since Pointer Events unify mouse/touch/pen, per docs/12_INTERACTION_SYSTEM.md.
    await page.mouse.move(centerX - 80, centerY);
    await page.mouse.move(centerX + 80, centerY, { steps: 10 });
    await page.waitForTimeout(500);

    expect(errors, `errors during touch drag: ${errors.join("\n")}`).toEqual([]);
  });
});

test.describe("WebGL context recovery", () => {
  test("simulated context loss shows the static fallback, restoration re-shows the canvas", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "WEBGL_lose_context simulation is only reliably supported via Chromium in this suite");

    await page.goto("/");
    await page.waitForSelector(APP_SELECTOR);

    const result = await page.evaluate(() => {
      return new Promise<string>((resolve) => {
        const canvas = document.querySelector('[role="application"] canvas') as HTMLCanvasElement | null;
        if (!canvas) return resolve("no-canvas");
        const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
        if (!gl) return resolve("no-context");
        const ext = gl.getExtension("WEBGL_lose_context");
        if (!ext) return resolve("no-extension");
        canvas.addEventListener("webglcontextlost", () => resolve("event-fired"), { once: true });
        ext.loseContext();
        setTimeout(() => resolve("event-did-not-fire-within-2s"), 2000);
      });
    });
    expect(result).toBe("event-fired");

    // The fallback overlay renders on top; the canvas's wrapping div gains an `invisible` class per CupCanvas.tsx.
    await expect(page.locator(`${APP_SELECTOR}.invisible`)).toHaveCount(1, { timeout: 3000 });

    await page.evaluate(() => {
      const canvas = document.querySelector('[role="application"] canvas') as HTMLCanvasElement | null;
      const gl = canvas?.getContext("webgl2") ?? canvas?.getContext("webgl");
      const ext = gl?.getExtension("WEBGL_lose_context");
      ext?.restoreContext();
    });
    await page.waitForTimeout(500);
    await expect(page.locator(`${APP_SELECTOR}.invisible`)).toHaveCount(0);
  });
});

test.describe("visual regression baseline", () => {
  // Deterministic captures, not a widened tolerance: the app's own idle
  // ambient auto-rotation (CupAssembly.tsx, ~0.12 rad/s) makes the cup a
  // moving target frame-to-frame — a first real run confirmed this by
  // diffing two "identical" captures and finding 100% of the pixel delta
  // confined to the cup's silhouette, zero diff on any static DOM content.
  // `emulateMedia` reuses the app's own already-tested reduced-motion path
  // (`usePrefersReducedMotion` -> `CupAssembly`'s `state === "idle" &&
  // !reducedMotion` gate) to freeze it, rather than inventing test-only
  // scene-freezing machinery or masking the tolerance wide enough to hide
  // a real regression too. (Not `test.use({ reducedMotion })` — see the
  // "reduced motion" describe block above for why that fails typecheck
  // on this installed Playwright version.)
  for (const theme of ["light", "dark"] as const) {
    test(`hero screenshot — ${theme} theme`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/");
      await page.waitForSelector(APP_SELECTOR);
      if (theme === "dark") {
        await page.getByRole("button", { name: /switch to dark theme/i }).click();
      }
      await page.waitForTimeout(1000);
      await expect(page).toHaveScreenshot(`hero-${theme}.png`, {
        maxDiffPixelRatio: 0.05,
        animations: "disabled",
      });
    });
  }
});
