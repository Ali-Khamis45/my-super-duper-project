"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { InventoryItemSummaryDto } from "@/lib/inventory-client";

import { InventoryStatusBadge } from "./InventoryStatusBadge";

interface InventoryTableProps {
  items: InventoryItemSummaryDto[];
  isLoading: boolean;
}

export function InventoryTable({ items, isLoading }: InventoryTableProps) {
  if (!isLoading && items.length === 0) {
    return <p className="text-muted-foreground py-12 text-center text-sm">No inventory items match these filters.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ingredient</TableHead>
          <TableHead>On hand</TableHead>
          <TableHead>Available</TableHead>
          <TableHead>Low-stock threshold</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.ingredientName}</TableCell>
            <TableCell>{item.stockLevel}</TableCell>
            <TableCell>{item.availableQuantity}</TableCell>
            <TableCell className="text-muted-foreground">{item.lowStockThreshold}</TableCell>
            <TableCell>
              <InventoryStatusBadge status={item.status} />
            </TableCell>
            <TableCell className="text-right">
              <Button size="sm" variant="ghost" render={<Link href={`/admin/inventory/${item.id}`} />}>
                View
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
