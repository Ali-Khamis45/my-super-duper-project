import type { Metadata } from "next";

import { CartExperience } from "@/features/cart/components/CartExperience";

export const metadata: Metadata = { title: "Cart" };

export default function CartPage() {
  return <CartExperience />;
}
