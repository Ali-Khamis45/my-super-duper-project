"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import * as productClient from "@/lib/product-client";

/**
 * Every mutation here invalidates the same three query families: the admin list (this mutation's
 * own effect), plus `menu`/`search`/`categories`/`ingredients` — the customer-facing surfaces
 * Sprint 5.2's Phase 6 wired to the same backend, since an admin publishing/archiving/repricing a
 * product is exactly the kind of change those pages need to reflect on next visit, not just this
 * admin session.
 */
function useInvalidateCatalog() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    queryClient.invalidateQueries({ queryKey: ["admin-product"] });
    queryClient.invalidateQueries({ queryKey: ["menu"] });
    queryClient.invalidateQueries({ queryKey: ["search"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    queryClient.invalidateQueries({ queryKey: ["ingredients"] });
  };
}

export function useProductMutations() {
  const invalidate = useInvalidateCatalog();

  const createProduct = useMutation({
    mutationFn: productClient.createProduct,
    onSuccess: invalidate,
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, input }: { id: string; input: productClient.UpdateProductInput }) => productClient.updateProduct(id, input),
    onSuccess: invalidate,
  });

  const updatePricing = useMutation({
    mutationFn: ({ id, price, compareAtPrice }: { id: string; price: number; compareAtPrice: number | null }) =>
      productClient.updatePricing(id, price, compareAtPrice),
    onSuccess: invalidate,
  });

  const assignCategory = useMutation({
    mutationFn: ({ id, categoryCode }: { id: string; categoryCode: string }) => productClient.assignCategory(id, categoryCode),
    onSuccess: invalidate,
  });

  const updateAvailability = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) => productClient.updateAvailability(id, isAvailable),
    onSuccess: invalidate,
  });

  const publishProduct = useMutation({ mutationFn: productClient.publishProduct, onSuccess: invalidate });
  const archiveProduct = useMutation({ mutationFn: productClient.archiveProduct, onSuccess: invalidate });
  const restoreProduct = useMutation({ mutationFn: productClient.restoreProduct, onSuccess: invalidate });
  const deleteProduct = useMutation({ mutationFn: productClient.deleteProduct, onSuccess: invalidate });

  const addImage = useMutation({
    mutationFn: ({ id, url, altText, isPrimary }: { id: string; url: string; altText: string | null; isPrimary: boolean }) =>
      productClient.addImage(id, url, altText, isPrimary),
    onSuccess: invalidate,
  });

  const removeImage = useMutation({
    mutationFn: ({ id, imageId }: { id: string; imageId: string }) => productClient.removeImage(id, imageId),
    onSuccess: invalidate,
  });

  return {
    createProduct,
    updateProduct,
    updatePricing,
    assignCategory,
    updateAvailability,
    publishProduct,
    archiveProduct,
    restoreProduct,
    deleteProduct,
    addImage,
    removeImage,
  };
}
