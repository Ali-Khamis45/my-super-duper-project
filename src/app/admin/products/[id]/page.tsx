"use client";

import { use } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useAdminProductQuery } from "@/features/admin/products/hooks/useAdminProductQuery";
import { ProductEditor } from "@/features/admin/products/components/ProductEditor";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: product, isLoading, isError } = useAdminProductQuery(id);

  if (isError) {
    return <p className="text-destructive text-sm">Couldn&apos;t load this product.</p>;
  }

  if (isLoading || !product) {
    return (
      <div className="flex max-w-2xl flex-col gap-3">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return <ProductEditor key={product.id} product={product} />;
}
