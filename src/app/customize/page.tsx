import type { Metadata } from "next";

import { CustomizerExperience } from "@/features/customizer/components/CustomizerExperience";

export const metadata: Metadata = { title: "Customize" };

export default function CustomizePage() {
  return <CustomizerExperience />;
}
