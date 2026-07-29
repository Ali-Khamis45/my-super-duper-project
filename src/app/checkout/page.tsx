import type { Metadata } from "next";

import { CheckoutExperience } from "@/features/cart/components/CheckoutExperience";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return <CheckoutExperience />;
}
