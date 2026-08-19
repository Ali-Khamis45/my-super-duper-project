"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaymentStatusBadge } from "@/features/payments/components/PaymentStatusBadge";
import type { PaymentSummaryDto } from "@/lib/payment-client";

interface AdminPaymentTableProps {
  payments: PaymentSummaryDto[];
  isLoading: boolean;
}

export function AdminPaymentTable({ payments, isLoading }: AdminPaymentTableProps) {
  if (!isLoading && payments.length === 0) {
    return <p className="text-muted-foreground py-12 text-center text-sm">No payments match these filters.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Provider</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((payment) => (
          <TableRow key={payment.id}>
            <TableCell className="font-medium">{payment.orderNumber ?? "—"}</TableCell>
            <TableCell>${payment.amount.toFixed(2)}</TableCell>
            <TableCell className="text-muted-foreground capitalize">{payment.provider}</TableCell>
            <TableCell>
              <PaymentStatusBadge status={payment.status} />
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">{new Date(payment.createdAtUtc).toLocaleDateString()}</TableCell>
            <TableCell className="text-right">
              <Button size="sm" variant="ghost" nativeButton={false} render={<Link href={`/admin/payments/${payment.id}`} />}>
                View
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
