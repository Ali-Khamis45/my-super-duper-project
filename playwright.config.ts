import { defineConfig, devices } from "@playwright/test";

/**
 * Sprint 2.6's tooling decision, made at sprint start per
 * docs/16_ENGINEERING_SPRINTS.md's own flag: "Visual regression tooling
 * decision — evaluate whether this is the point the target Playwright
 * stack finally gets installed... decided at sprint start based on what
 * shipped." It is — this sprint's own brief names Cross-browser Validation
 * and Visual Regression Baseline as concrete deliverables, which need a
 * real multi-engine browser runner, not just Vitest+jsdom.
 *
 * Three projects, not four: Chromium and WebKit are Playwright's own
 * bundled engines (real Blink/WebKit, not a proxy for Chrome/Safari, but
 * the closest thing to each available on this Windows dev machine — no
 * macOS exists here to run real Safari). Firefox is Playwright's bundled
 * Gecko build. "Edge" isn't a fourth project: it's Chromium under a
 * different name, and this project's own installed Edge binary was
 * spot-checked separately (see docs/reviews/sprint-2.6-review.md) rather
 * than wired into this automated suite, since Playwright doesn't drive a
 * system-installed Edge any differently than its bundled Chromium build.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // 0 locally — a flake here should surface immediately during development, never be
  // silently absorbed. A real, CI-only failure (see CI workflow's own e2e-smoke job)
  // confirmed this needs a narrow exception: the very first interaction of a cold CI
  // run missed AddToCartButton's 1200ms "Added" confirmation window — every other
  // add-to-cart interaction in the same run, on the now-warm dev server, passed. One
  // retry on CI only absorbs exactly that class of first-hit cold-start jitter without
  // masking a real regression (a genuinely broken feature still fails both attempts).
  retries: process.env.CI ? 1 : 0,
  // Default 30s was occasionally too tight for repeated real-interaction
  // tests (8 theme toggles) under this dev machine's headless-Chromium
  // click-stability checks running alongside everything else this sprint
  // spun up — a real environmental slowdown, not app-code flakiness (the
  // slow run still produced zero console/page errors). 45s gives headroom
  // without masking a genuine hang.
  timeout: 45_000,
  // Default 5s was too tight for `toHaveScreenshot` specifically when all
  // three browser projects capture in parallel on this single dev
  // machine — same root cause as the theme-switching test's timeout above.
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
