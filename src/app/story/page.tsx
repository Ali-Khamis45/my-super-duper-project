import type { Metadata } from "next";

import { ComingSoonPage } from "@/components/layout/ComingSoonPage";

export const metadata: Metadata = { title: "Our Story" };

export default function StoryPage() {
  return (
    <ComingSoonPage
      title="A story worth scrolling for."
      description="From bean to cup, told through cinematic scroll — roasting, grinding, brewing. Arriving in Milestone 6."
      milestone="Milestone 6 — Scroll Storytelling"
    />
  );
}
