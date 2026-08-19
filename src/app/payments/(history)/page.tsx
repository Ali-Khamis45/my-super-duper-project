import type { Metadata } from "next";

import { PaymentHistoryList } from "@/features/payments/components/PaymentHistoryList";

export const metadata: Metadata = { title: "My Payments" };

export default function PaymentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl">My Payments</h1>
      <PaymentHistoryList />
    </div>
  );
}
