import { brandAccent, cream, espresso, oklchToCssRgba } from "@/design-system/tokens/colors";

interface BrandMarkProps {
  size?: number;
  className?: string;
}

/**
 * Sprint 3.9, Task 3 — the one vector source every brand surface renders
 * from: the Navbar's DOM logo and every generated icon/social-image route
 * (`src/app/icon.tsx`, `apple-icon.tsx`, `opengraph-image.tsx`,
 * `twitter-image.tsx`) all render this exact component. It has no hooks and
 * no state, so `next/og`'s `ImageResponse` (Satori) can compose it directly
 * alongside a real DOM `<svg>` use of the same component — one definition,
 * every surface pixel-consistent, per the brief's "all assets should
 * originate from one vector source."
 *
 * A simplified silhouette of the product itself (lid / tapered body /
 * sleeve band) rather than a generic coffee-cup glyph, so the mark and the
 * 3D cup read as the same object at every size — deliberately geometric and
 * flat (no gradients, no photorealism), the Apple/Linear/Raycast/Arc
 * register the brief asks for. Colors are read from the design tokens, not
 * hardcoded, per `docs/06_CODING_STANDARDS.md`'s "no duplicated values
 * outside tokens" rule.
 */
export function BrandMark({ size = 32, className }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M6 10 L26 10 L24 13.2 L8 13.2 Z" fill={oklchToCssRgba(espresso[800])} />
      <path
        d="M8 13.2 L24 13.2 L21.6 27 Q21.4 28.4 20 28.4 L12 28.4 Q10.6 28.4 10.4 27 Z"
        fill={oklchToCssRgba(cream[50])}
        stroke={oklchToCssRgba(cream[400])}
        strokeWidth="0.6"
      />
      <path d="M8.9 17.6 L23.1 17.6 L22 22.6 L10 22.6 Z" fill={oklchToCssRgba(brandAccent[500])} />
    </svg>
  );
}
