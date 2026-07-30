import { ImageResponse } from "next/og";

import { BrandMark } from "@/design-system/brand/BrandMark";
import { cream, oklchToCssRgba } from "@/design-system/tokens/colors";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Sprint 3.9, Task 3 — iOS applies its own corner mask, so this fills the full canvas edge-to-edge rather than pre-rounding it. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: oklchToCssRgba(cream[100]),
        }}
      >
        <BrandMark size={130} />
      </div>
    ),
    { ...size },
  );
}
