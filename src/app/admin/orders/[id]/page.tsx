"use client";

import { use } from "react";

import { AccessDenied } from "@/features/admin/components/AccessDenied";
import { AdminOrderDetail } from "@/features/admin/orders/components/AdminOrderDetail";
import { useRequireViewOrders } from "@/features/admin/hooks/useRequireViewOrders";

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const guardState = useRequireViewOrders();

  if (guardState === "checking" || guardState === "unauthenticated") {
    return <div aria-busy="true" aria-label="Checking access" />;
  }

  if (guardState === "forbidden") {
    return <AccessDenied />;
  }

  return <AdminOrderDetail orderId={id} />;
}
