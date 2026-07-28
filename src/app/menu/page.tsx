import type { Metadata } from "next";

import { ComingSoonPage } from "@/components/layout/ComingSoonPage";

export const metadata: Metadata = { title: "Menu" };

export default function MenuPage() {
  return (
    <ComingSoonPage
      title="The menu is brewing."
      description="Espresso, cold brew, seasonal drinks — with live 3D previews for every one. Arriving in Milestone 5."
      milestone="Milestone 5 — Ingredient Builder & Menu"
    />
  );
}
