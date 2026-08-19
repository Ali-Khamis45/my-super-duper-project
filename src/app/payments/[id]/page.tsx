"use client";

import { use } from "react";

import { PaymentReceipt } from "@/features/payments/components/PaymentReceipt";

export default function PaymentReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PaymentReceipt paymentId={id} />;
}
