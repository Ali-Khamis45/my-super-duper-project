import { ImageResponse } from "next/og";

import { SOCIAL_IMAGE_ALT, SOCIAL_IMAGE_SIZE, SocialImageContent } from "@/design-system/brand/SocialImage";

export const alt = SOCIAL_IMAGE_ALT;
export const size = SOCIAL_IMAGE_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(<SocialImageContent />, { ...size });
}
