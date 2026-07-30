"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrderStatusBadge } from "@/features/orders/components/OrderStatusBadge";
import type { OrderSummaryDto } from "@/lib/order-client";

interface AdminOrderTableProps {
  orders: OrderSummaryDto[];
  isLoading: boolean;
}

export function AdminOrderTable({ orders, isLoading }: AdminOrderTableProps) {
  if (!isLoading && orders.length === 0) {
    return <p className="text-muted-foreground py-12 text-center text-sm">No orders match these filters.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Items</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Placed</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell className="font-medium">{order.orderNumber}</TableCell>
            <TableCell className="text-muted-foreground">{order.guestName ?? (order.customerId ? "Account holder" : "—")}</TableCell>
            <TableCell>{order.itemCount}</TableCell>
            <TableCell>${order.total.toFixed(2)}</TableCell>
            <TableCell>
              <OrderStatusBadge status={order.status} />
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">{new Date(order.createdAtUtc).toLocaleDateString()}</TableCell>
            <TableCell className="text-right">
              <Button size="sm" variant="ghost" render={<Link href={`/admin/orders/${order.id}`} />}>
                View
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
