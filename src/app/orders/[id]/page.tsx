"use client";

import { use } from "react";

import { OrderDetails } from "@/features/orders/components/OrderDetails";

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <OrderDetails orderId={id} />;
}
