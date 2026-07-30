import type { Metadata } from "next";

import { MyOrdersList } from "@/features/orders/components/MyOrdersList";

export const metadata: Metadata = { title: "My Orders" };

export default function OrdersPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl">My Orders</h1>
      <MyOrdersList />
    </div>
  );
}
