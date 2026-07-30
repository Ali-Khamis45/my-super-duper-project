import { ImageResponse } from "next/og";

import { BrandMark } from "@/design-system/brand/BrandMark";
import { cream, oklchToCssRgba } from "@/design-system/tokens/colors";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Sprint 3.9, Task 3 — the favicon; see `BrandMark`'s own doc comment for why this is the one vector source every brand surface shares. */
export default function Icon() {
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
          borderRadius: 7,
        }}
      >
        <BrandMark size={26} />
      </div>
    ),
    { ...size },
  );
}
