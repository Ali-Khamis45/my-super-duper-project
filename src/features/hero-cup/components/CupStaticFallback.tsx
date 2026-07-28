/**
 * Real fallback for no-WebGL / pre-hydration — a static, on-brand SVG
 * illustration, never a bare spinner. The steam wisps use a CSS animation
 * scoped to `motion-safe`, so reduced-motion is respected without JS.
 */
export function CupStaticFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <svg
        viewBox="0 0 200 220"
        className="h-auto w-56 drop-shadow-[0_30px_40px_oklch(0_0_0/0.25)] sm:w-72"
        role="img"
        aria-label="A stylized illustration of a coffee cup with a lid and sleeve"
      >
        <ellipse cx="100" cy="205" rx="55" ry="8" className="fill-black/10 dark:fill-black/30" />

        <path
          d="M 62 90 L 68 195 Q 100 205 132 195 L 138 90 Z"
          className="fill-cream-50 stroke-cream-300"
          strokeWidth="1.5"
        />

        <rect x="63" y="110" width="74" height="55" rx="4" className="fill-espresso-400/90" />

        <path
          d="M 58 78 Q 100 65 142 78 L 138 92 Q 100 80 62 92 Z"
          className="fill-espresso-800"
        />
        <ellipse cx="100" cy="79" rx="42" ry="10" className="fill-espresso-700" />

        <g className="motion-safe:animate-[steam-rise_3.4s_ease-in-out_infinite] opacity-70">
          <path
            d="M 88 60 Q 82 48 90 38 Q 98 28 92 16"
            fill="none"
            className="stroke-cream-300"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M 112 60 Q 106 46 114 36 Q 122 26 116 14"
            fill="none"
            className="stroke-cream-300"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}
