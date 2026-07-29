import type { Metadata } from "next";

import { ConciergeExperience } from "@/features/concierge/components/ConciergeExperience";

export const metadata: Metadata = { title: "AI Concierge" };

export default function ConciergePage() {
  return <ConciergeExperience />;
}
