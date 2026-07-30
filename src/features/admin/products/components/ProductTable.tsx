"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProductSummaryDto } from "@/lib/catalog-types";

import { useProductMutations } from "../hooks/useProductMutations";
import { formatCategoryCode } from "../lib/formatCategoryCode";

interface ProductTableProps {
  products: ProductSummaryDto[];
  isLoading: boolean;
}

const STATUS_VARIANT: Record<ProductSummaryDto["status"], "default" | "secondary" | "outline"> = {
  draft: "outline",
  published: "default",
  archived: "secondary",
};

export function ProductTable({ products, isLoading }: ProductTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const mutations = useProductMutations();

  const allSelected = products.length > 0 && products.every((p) => selected.has(p.id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(products.map((p) => p.id)));
  }

  function toggleOne(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkArchive() {
    // Sequential, not `Promise.all` — a shared `invalidate()` fires after every single mutation
    // already (`useProductMutations`'s own design), so parallelizing here would just fire the
    // same list refetch N times for zero speed benefit, on an action that's rare enough (a
    // deliberate admin cleanup pass, not a hot path) that a few hundred ms of sequencing is fine.
    for (const id of selected) {
      await mutations.archiveProduct.mutateAsync(id);
    }
    setSelected(new Set());
  }

  if (!isLoading && products.length === 0) {
    return <p className="text-muted-foreground py-12 text-center text-sm">No products match these filters.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {selected.size > 0 && (
        <div className="bg-muted flex items-center justify-between rounded-lg px-3 py-2 text-sm">
          <span>{selected.size} selected</span>
          <Button size="sm" variant="outline" onClick={bulkArchive} disabled={mutations.archiveProduct.isPending}>
            Archive selected
          </Button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all products" />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Available</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <Checkbox checked={selected.has(product.id)} onCheckedChange={() => toggleOne(product.id)} aria-label={`Select ${product.name}`} />
              </TableCell>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell className="text-muted-foreground font-mono text-xs">{product.sku}</TableCell>
              <TableCell>{formatCategoryCode(product.category)}</TableCell>
              <TableCell>${product.price.toFixed(2)}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[product.status]}>{product.status}</Badge>
              </TableCell>
              <TableCell>{product.isAvailable ? "Yes" : "No"}</TableCell>
              <TableCell className="flex justify-end gap-1">
                <Button size="sm" variant="ghost" render={<Link href={`/admin/products/${product.id}`} />}>
                  Edit
                </Button>
                {product.status === "draft" && (
                  <Button size="sm" variant="ghost" onClick={() => mutations.publishProduct.mutate(product.id)} disabled={mutations.publishProduct.isPending}>
                    Publish
                  </Button>
                )}
                {product.status !== "archived" && (
                  <Button size="sm" variant="ghost" onClick={() => mutations.archiveProduct.mutate(product.id)} disabled={mutations.archiveProduct.isPending}>
                    Archive
                  </Button>
                )}
                {product.status === "archived" && (
                  <Button size="sm" variant="ghost" onClick={() => mutations.restoreProduct.mutate(product.id)} disabled={mutations.restoreProduct.isPending}>
                    Restore
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
