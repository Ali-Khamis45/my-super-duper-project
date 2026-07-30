import type { MetadataRoute } from "next";

import { cream, espresso, oklchToCssRgba } from "@/design-system/tokens/colors";

/**
 * Sprint 3.9, Task 3. `icon`/`apple-icon` below are the exact routes
 * `src/app/icon.tsx`/`apple-icon.tsx` generate — Next serves App Router
 * icon/apple-icon file conventions at those literal paths regardless of the
 * cache-busting query string its own auto-injected `<link>` tags append
 * (see docs/01-app/.../app-icons.md's own `<head> output` examples), so
 * this manifest can reference them directly rather than duplicating the
 * brand mark as a third, separately-generated asset. Dedicated 192x192/512x512
 * PWA install rasters were deliberately not added — the icon/apple-icon
 * pipeline above is `next/og`'s `ImageResponse`, which only renders through
 * the file-convention routes Next itself wires up; producing arbitrary
 * fixed-size PNGs on disk would need a real image-rasterization dependency
 * this project doesn't otherwise have a use for. Documented, not silently
 * skipped — see docs/reviews/sprint-3.9-review.md.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Coffeshop — A Premium Coffee Experience",
    short_name: "Coffeshop",
    description:
      "An interactive, premium coffee-shop experience — craft-first, motion-driven, built to be used, not just viewed.",
    start_url: "/",
    display: "standalone",
    background_color: oklchToCssRgba(cream[50]),
    theme_color: oklchToCssRgba(espresso[800]),
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}
