import type { Metadata } from "next";

import { OrderConfirmation } from "@/features/cart/components/OrderConfirmation";

export const metadata: Metadata = { title: "Order Confirmed" };

export default function OrderConfirmationPage() {
  return <OrderConfirmation />;
}
