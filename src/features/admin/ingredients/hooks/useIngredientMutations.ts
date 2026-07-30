"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type CreateIngredientInput, createIngredient, type UpdateIngredientInput, updateIngredient } from "@/lib/ingredient-client";

export function useIngredientMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ingredients"] });

  const create = useMutation({
    mutationFn: (input: CreateIngredientInput) => createIngredient(input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ code, input }: { code: string; input: UpdateIngredientInput }) => updateIngredient(code, input),
    onSuccess: invalidate,
  });

  return { create, update };
}
