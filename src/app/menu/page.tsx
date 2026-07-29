import type { Metadata } from "next";

import { MenuExperience } from "@/features/menu/components/MenuExperience";

export const metadata: Metadata = { title: "Menu" };

export default function MenuPage() {
  return <MenuExperience />;
}
