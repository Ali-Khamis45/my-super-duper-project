import type { Metadata } from "next";

import { StoryExperience } from "@/features/storytelling/components/StoryExperience";

export const metadata: Metadata = { title: "Our Story" };

export default function StoryPage() {
  return <StoryExperience />;
}
