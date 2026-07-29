import type { Metadata } from "next";

import { CustomizerExperience } from "@/features/customizer/components/CustomizerExperience";

export const metadata: Metadata = { title: "Customize" };

interface CustomizePageProps {
  searchParams: Promise<{ drink?: string }>;
}

export default async function CustomizePage({ searchParams }: CustomizePageProps) {
  const { drink } = await searchParams;
  return <CustomizerExperience drinkId={drink} />;
}
