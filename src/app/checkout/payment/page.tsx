import type { Metadata } from "next";

import { PaymentProcessing } from "@/features/cart/components/PaymentProcessing";

export const metadata: Metadata = { title: "Confirming Payment" };

export default function CheckoutPaymentPage() {
  return <PaymentProcessing />;
}
