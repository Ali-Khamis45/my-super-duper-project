import { BrandMark } from "@/design-system/brand/BrandMark";
import { brandAccent, cream, espresso, oklchToCssRgba } from "@/design-system/tokens/colors";

export const SOCIAL_IMAGE_SIZE = { width: 1200, height: 630 };
export const SOCIAL_IMAGE_ALT = "Coffeshop — a premium, interactive coffee experience";

/**
 * Sprint 3.9, Task 3 — shared between `opengraph-image.tsx` and
 * `twitter-image.tsx` so the two social previews render from one definition
 * (both platforms accept the same 1200x630 asset; Next just requires two
 * separate file-convention routes to serve it). Not a route itself — a
 * plain component, so it's Satori-safe to compose inside `ImageResponse`.
 */
export function SocialImageContent() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${oklchToCssRgba(espresso[900])} 0%, ${oklchToCssRgba(espresso[700])} 100%)`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 140,
          height: 140,
          borderRadius: 28,
          background: oklchToCssRgba(cream[50]),
          marginBottom: 40,
        }}
      >
        <BrandMark size={92} />
      </div>
      <div style={{ display: "flex", fontSize: 72, color: oklchToCssRgba(cream[50]), fontWeight: 600 }}>
        Coffeshop
      </div>
      <div style={{ display: "flex", fontSize: 30, color: oklchToCssRgba(brandAccent[400]), marginTop: 16 }}>
        Crafted for the senses.
      </div>
    </div>
  );
}
