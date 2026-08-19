"use client";

import { use } from "react";

import { AccessDenied } from "@/features/admin/components/AccessDenied";
import { useRequireViewPayments } from "@/features/admin/hooks/useRequireViewPayments";
import { AdminPaymentDetail } from "@/features/admin/payments/components/AdminPaymentDetail";

export default function AdminPaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const guardState = useRequireViewPayments();

  if (guardState === "checking" || guardState === "unauthenticated") {
    return <div aria-busy="true" aria-label="Checking access" />;
  }

  if (guardState === "forbidden") {
    return <AccessDenied />;
  }

  return <AdminPaymentDetail paymentId={id} />;
}
