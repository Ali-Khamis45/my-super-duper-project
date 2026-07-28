import type { Metadata } from "next";

import { ComingSoonPage } from "@/components/layout/ComingSoonPage";

export const metadata: Metadata = { title: "Customize" };

export default function CustomizePage() {
  return (
    <ComingSoonPage
      title="Build your cup, live."
      description="Cup, sleeve, beans, milk, foam — every choice updates the 3D model, price, and nutrition in real time. Arriving in Milestone 4."
      milestone="Milestone 4 — Live Customizer"
    />
  );
}
