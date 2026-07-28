import type { Metadata } from "next";

import { DesignSystemPreview } from "@/design-system/DesignSystemPreview";

export const metadata: Metadata = {
  title: "Design System",
};

export default function DesignSystemPage() {
  return (
    <main id="main-content">
      <DesignSystemPreview />
    </main>
  );
}
