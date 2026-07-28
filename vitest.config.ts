import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Unit/component test runner for pure logic and hooks — Vitest + React
 * Testing Library, per docs/11_TESTING_QA.md and docs/21_TEST_STRATEGY.md.
 * Playwright (e2e/visual) is a separate, still-deferred decision — see
 * docs/16_ENGINEERING_SPRINTS.md's Sprint 2.6 note.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
