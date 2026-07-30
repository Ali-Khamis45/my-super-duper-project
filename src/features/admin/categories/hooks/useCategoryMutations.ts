"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createCategory, updateCategory } from "@/lib/category-client";

export function useCategoryMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["categories"] });

  const create = useMutation({
    mutationFn: ({ code, name, sortOrder }: { code: string; name: string; sortOrder: number }) => createCategory(code, name, sortOrder),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, name, sortOrder }: { id: string; name: string; sortOrder: number }) => updateCategory(id, name, sortOrder),
    onSuccess: invalidate,
  });

  return { create, update };
}
